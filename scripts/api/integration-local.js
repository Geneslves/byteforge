import { createWriteStream, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const host = '127.0.0.1';
const port = 8788;
const baseUrl = `http://${host}:${port}`;
const database = 'byteforge';
const persistTo = '.wrangler/state';
const runtimeLogs = join('runtime', 'logs');
const wranglerHome = resolve('runtime', 'tmp', 'wrangler');
const wranglerEnv = {
  ...process.env,
  XDG_CONFIG_HOME: join(wranglerHome, 'config'),
  XDG_CACHE_HOME: join(wranglerHome, 'cache'),
  XDG_STATE_HOME: join(wranglerHome, 'state'),
  WRANGLER_REGISTRY_PATH: join(wranglerHome, 'registry'),
  WRANGLER_LOG_PATH: join(wranglerHome, 'logs'),
  WRANGLER_SEND_METRICS: 'false',
};
const wrangler = process.platform === 'win32'
  ? join('node_modules', '.bin', 'wrangler.cmd')
  : join('node_modules', '.bin', 'wrangler');
const node = process.execPath;

const run = (command, args, label) => {
  console.log(`> ${label}`);
  const isCmd = process.platform === 'win32' && command.endsWith('.cmd');
  const result = spawnSync(isCmd ? 'cmd.exe' : command, isCmd ? ['/d', '/c', command, ...args] : args, {
    cwd: process.cwd(),
    env: command.includes('wrangler') ? wranglerEnv : process.env,
    encoding: 'utf8',
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    const reason = result.error ? ` (${result.error.message})` : '';
    throw new Error(`${label} failed with exit code ${result.status}${reason}`);
  }
};

const waitForHealth = async (timeoutMs = 30000) => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {
      // Retry until the local server is ready.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${baseUrl}/api/health`);
};

const requestJson = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  return { response, data };
};

const describeResult = (result) => `${result.response.status} ${JSON.stringify(result.data)}`;

const assertOk = (condition, message) => {
  if (!condition) throw new Error(message);
};

let server;
let outputStream;
let errorStream;
let completed = false;

const stopServer = () => {
  if (!server || server.killed) return;

  if (process.platform === 'win32') {
    spawnSync('taskkill.exe', ['/pid', String(server.pid), '/t', '/f'], {
      stdio: 'ignore',
    });
  } else {
    server.kill('SIGTERM');
  }

  server.stdout?.destroy();
  server.stderr?.destroy();
};

try {
  mkdirSync(runtimeLogs, { recursive: true });
  mkdirSync(wranglerEnv.XDG_CONFIG_HOME, { recursive: true });
  mkdirSync(wranglerEnv.XDG_CACHE_HOME, { recursive: true });
  mkdirSync(wranglerEnv.XDG_STATE_HOME, { recursive: true });
  mkdirSync(wranglerEnv.WRANGLER_REGISTRY_PATH, { recursive: true });
  mkdirSync(wranglerEnv.WRANGLER_LOG_PATH, { recursive: true });

  run(node, ['scripts/build.js'], 'Build static site');
  run(process.platform === 'win32' ? join('node_modules', '.bin', 'pagefind.cmd') : join('node_modules', '.bin', 'pagefind'), ['--site', 'dist', '--output-subdir', 'pagefind'], 'Build Pagefind index');
  run(node, ['scripts/db/reset-local.js', database], 'Reset and seed local D1');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  outputStream = createWriteStream(join(runtimeLogs, `api-integration-${timestamp}.out.log`));
  errorStream = createWriteStream(join(runtimeLogs, `api-integration-${timestamp}.err.log`));

  const wranglerArgs = [
    'pages',
    'dev',
    'dist',
    '--persist-to',
    persistTo,
    '--ip',
    host,
    '--port',
    String(port),
  ];
  server = spawn(process.platform === 'win32' ? 'cmd.exe' : wrangler, process.platform === 'win32' ? ['/d', '/c', wrangler, ...wranglerArgs] : wranglerArgs, {
    cwd: process.cwd(),
    env: wranglerEnv,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.pipe(outputStream);
  server.stderr.pipe(errorStream);

  await waitForHealth();

  const suffix = Math.floor(Math.random() * 100000000);
  const username = `api${suffix}`;
  const password = `ByteForge${suffix}Test!`;
  const email = `${username}@test.local`;

  const register = await requestJson('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password }),
  });
  assertOk(register.response.ok, `register failed: ${describeResult(register)}`);
  assertOk(register.data?.token && register.data?.refreshToken, 'register should return access and refresh tokens');
  assertOk(register.data?.user?.role === 'admin', 'first local test user should be admin after reset');

  const login = await requestJson('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  assertOk(login.response.ok, `login failed: ${describeResult(login)}`);
  assertOk(login.data?.token && login.data?.refreshToken, 'login should return access and refresh tokens');

  const me = await requestJson('/api/auth/me', {
    headers: { Authorization: `Bearer ${login.data.token}` },
  });
  assertOk(me.response.ok, `me failed: ${describeResult(me)}`);
  assertOk(me.data?.user?.username === username, 'me should return the logged-in user');

  const refresh = await requestJson('/api/v1/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: login.data.refreshToken }),
  });
  assertOk(refresh.response.ok, `refresh failed: ${describeResult(refresh)}`);
  assertOk(refresh.data?.token, 'refresh should return a new access token');

  const settings = await requestJson('/api/admin/settings', {
    headers: { Authorization: `Bearer ${login.data.token}` },
  });
  assertOk(settings.response.ok, `admin settings failed: ${describeResult(settings)}`);
  assertOk(settings.data?.settings?.registration_enabled === true, 'seeded settings should be readable by admin');

  let okCount = 0;
  let rateLimitedAt = null;
  const rateIp = `203.0.113.${suffix % 200}`;
  for (let index = 1; index <= 105; index += 1) {
    const result = await requestJson('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${login.data.token}`,
        'X-Forwarded-For': rateIp,
      },
    });
    if (result.response.status === 429) {
      rateLimitedAt = index;
      break;
    }
    if (result.response.ok) okCount += 1;
  }
  assertOk(okCount === 100 && rateLimitedAt === 101, `rate limit expected 100 OK then 429 at 101; got ok=${okCount}, limited=${rateLimitedAt}`);

  console.log(`API integration passed: user=${username}, rateLimitedAt=${rateLimitedAt}`);
  completed = true;
} finally {
  stopServer();
  outputStream?.end();
  errorStream?.end();
  if (completed) process.exit(0);
}
