import {
  generateToken,
  hashPassword,
  verifyPassword,
  verifyToken,
} from '../functions/lib/auth.js';
import { existsSync, readFileSync } from 'node:fs';
import { Script } from 'node:vm';

const errors = [];
const env = { JWT_SECRET: '0123456789abcdef0123456789abcdef' };

const expect = (condition, message) => {
  if (!condition) errors.push(message);
};

const passwordHash = await hashPassword('correct horse battery staple');
expect(passwordHash.startsWith('pbkdf2_sha256$'), 'password hashes should use pbkdf2_sha256 format');
expect(await verifyPassword('correct horse battery staple', passwordHash), 'verifyPassword should accept the original password');
expect(!(await verifyPassword('wrong password', passwordHash)), 'verifyPassword should reject the wrong password');

const token = await generateToken({ userId: 'u_1', role: 'admin' }, env);
const payload = await verifyToken(token, env);
expect(payload?.userId === 'u_1', 'verifyToken should decode a valid token');

const wrongSecretPayload = await verifyToken(token, { JWT_SECRET: 'fedcba9876543210fedcba9876543210' });
expect(wrongSecretPayload === null, 'verifyToken should reject tokens signed with a different secret');

let missingSecretRejected = false;
try {
  await generateToken({ userId: 'u_1' }, {});
} catch (error) {
  missingSecretRejected = error.message === 'JWT_SECRET is not configured';
}
expect(missingSecretRejected, 'generateToken should reject missing JWT_SECRET');

const authFiles = [
  'public/api-client.js',
  'public/auth.js',
  'public/login.html',
  'public/test-auth-flow.html',
];

for (const filePath of authFiles) {
  expect(existsSync(filePath), `${filePath} should exist`);
}

const assertNoMojibake = (filePath, source) => {
  const mojibakePattern = /锛|銆|鈥|鉁|馃|鐧|娉|璁|闇|绠|缃|閿|�||||€/;
  expect(!mojibakePattern.test(source), `${filePath} should not contain mojibake text`);
};

const assertScriptParses = (name, source) => {
  try {
    new Script(source, { filename: name });
  } catch (error) {
    errors.push(`${name} should parse as JavaScript: ${error.message}`);
  }
};

for (const filePath of authFiles) {
  if (!existsSync(filePath)) continue;

  const source = readFileSync(filePath, 'utf8');
  assertNoMojibake(filePath, source);

  if (filePath.endsWith('.js')) {
    assertScriptParses(filePath, source);
  }

  if (filePath.endsWith('.html')) {
    const inlineScripts = [...source.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
    inlineScripts.forEach((match, index) => {
      assertScriptParses(`${filePath} inline script ${index + 1}`, match[1]);
    });
  }
}

if (existsSync('public/login.html')) {
  const loginHtml = readFileSync('public/login.html', 'utf8');
  expect(loginHtml.includes('<title>身份验证 | ByteForge</title>'), 'login page should render readable Chinese title');
  expect(loginHtml.includes('minlength="12"'), 'login page password requirement should match backend minimum length');
}

if (existsSync('public/test-auth-flow.html')) {
  const testPage = readFileSync('public/test-auth-flow.html', 'utf8');
  for (const requiredSnippet of [
    '<title>认证流程测试 - ByteForge</title>',
    "const TEST_PASSWORD = 'secure-password-123'",
    'let currentTestCredentials = null;',
    'currentTestCredentials || DEFAULT_TEST_CREDENTIALS',
    'async function testRegister()',
    'async function testLogin()',
    'async function testRefreshToken()',
    "apiClient.requestJson('/api/auth/me')",
  ]) {
    expect(testPage.includes(requiredSnippet), `test auth flow page should include: ${requiredSnippet}`);
  }

  expect(
    !testPage.includes("fetch(`${API_BASE}/api/health`)"),
    'rate-limit test should not call /api/health because global middleware intentionally skips health checks'
  );
  expect(
    testPage.includes("fetch(`${API_BASE}/api/auth/me`"),
    'rate-limit test should call a real rate-limited endpoint'
  );
}

if (existsSync('schema/d1.sql')) {
  const schema = readFileSync('schema/d1.sql', 'utf8');
  expect(schema.includes('CREATE TABLE IF NOT EXISTS refresh_tokens'), 'schema/d1.sql should include refresh_tokens table used by auth endpoints');
  expect(schema.includes('idx_refresh_tokens_token_hash'), 'schema/d1.sql should index refresh token hashes');
}

if (errors.length) {
  for (const error of errors) console.error(`ERROR ${error}`);
  process.exit(1);
}

console.log('Auth check passed: PBKDF2, env-based JWT, readable auth pages, and refresh-token schema verified.');
