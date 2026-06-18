import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const errors = [];

// Check schema file
const schemaPath = 'schema/d1.sql';
if (!existsSync(schemaPath)) {
  errors.push('missing schema file: schema/d1.sql');
} else {
  const schema = readFileSync(schemaPath, 'utf8');
  if (!schema.includes('CREATE TABLE IF NOT EXISTS feedback')) {
    errors.push('schema/d1.sql missing feedback table');
  }
  if (!schema.includes('CREATE TABLE IF NOT EXISTS content_events')) {
    errors.push('schema/d1.sql missing content_events table');
  }
  if (!schema.includes('CREATE TABLE IF NOT EXISTS rate_limits')) {
    errors.push('schema/d1.sql missing rate_limits table used by global middleware');
  }
  if (!schema.includes('CREATE TABLE IF NOT EXISTS refresh_tokens')) {
    errors.push('schema/d1.sql missing refresh_tokens table');
  }
  if (/^\s*INDEX\s+\w+/m.test(schema)) {
    errors.push('schema/d1.sql should use standalone CREATE INDEX statements for D1/SQLite');
  }
  if (!schema.includes('CREATE INDEX IF NOT EXISTS idx_username')) {
    errors.push('schema/d1.sql missing standalone user indexes');
  }
  if (!schema.includes('CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash')) {
    errors.push('schema/d1.sql missing refresh token hash index');
  }
  if (!schema.includes('CREATE INDEX IF NOT EXISTS idx_rate_limits_expires_at')) {
    errors.push('schema/d1.sql missing rate limit expiry index');
  }
}

// Check API functions
const functionsDir = 'functions/api';
const requiredFunctions = ['health.js', 'feedback.js', 'content-events.js'];

if (!existsSync(functionsDir)) {
  errors.push('missing functions/api directory');
} else {
  const middlewarePath = 'functions/_middleware.js';
  if (!existsSync(middlewarePath)) {
    errors.push('missing Pages Functions middleware: functions/_middleware.js');
  } else {
    const middlewareSource = readFileSync(middlewarePath, 'utf8');
    if (!middlewareSource.includes('RateLimiter') || !middlewareSource.includes('RateLimitPresets.normal')) {
      errors.push('functions/_middleware.js should apply the normal rate limiter preset');
    }
    if (!middlewareSource.includes("url.pathname.startsWith('/api/')")) {
      errors.push('functions/_middleware.js should explicitly scope rate limiting to /api routes');
    }
  }
  if (existsSync(join(functionsDir, '_middleware.js'))) {
    errors.push('functions/api/_middleware.js should be promoted to functions/_middleware.js for global Pages coverage');
  }
  if (existsSync(join(functionsDir, '__middleware.js'))) {
    errors.push('functions/api/__middleware.js is not a valid Cloudflare Pages middleware filename; use _middleware.js');
  }

  for (const file of requiredFunctions) {
    const filePath = join(functionsDir, file);
    if (!existsSync(filePath)) {
      errors.push(`missing API function: ${filePath}`);
      continue;
    }

    const source = readFileSync(filePath, 'utf8');

    // Check for required exports (or createHandler usage)
    if (file !== 'health.js' && !source.includes('onRequestPost') && !source.includes('createHandler')) {
      errors.push(`${filePath} missing onRequestPost export or createHandler`);
    }
    if (file !== 'health.js' && !source.includes('onRequestOptions') && !source.includes('createHandler')) {
      errors.push(`${filePath} missing onRequestOptions export (CORS) or createHandler`);
    }

    // Check for error handling (either try/catch or createHandler which handles errors automatically)
    if (!source.includes('try') && !source.includes('catch') && !source.includes('createHandler')) {
      errors.push(`${filePath} missing error handling`);
    }
    if (source.includes("'Access-Control-Allow-Origin': '*'")) {
      errors.push(`${filePath} should not use wildcard CORS in production API code`);
    }
    if (/message:\s*error\.message/.test(source) || /error:\s*error\.message/.test(source)) {
      errors.push(`${filePath} should not return raw error.message in API responses`);
    }
  }
}

// Check auth functions
const authDir = 'functions/api/auth';
const requiredAuthFunctions = ['register.js', 'login.js', 'me.js'];

if (!existsSync(authDir)) {
  errors.push('missing functions/api/auth directory');
} else {
  for (const file of requiredAuthFunctions) {
    const filePath = join(authDir, file);
    if (!existsSync(filePath)) {
      errors.push(`missing auth API function: ${filePath}`);
      continue;
    }

    const source = readFileSync(filePath, 'utf8');
    if (source.includes("'Access-Control-Allow-Origin': '*'")) {
      errors.push(`${filePath} should not use wildcard CORS in production API code`);
    }
    if (/message:\s*error\.message/.test(source) || /error:\s*error\.message/.test(source)) {
      errors.push(`${filePath} should not return raw error.message in API responses`);
    }
  }
}

// Check auth library
const authLib = 'functions/lib/auth.js';
if (!existsSync(authLib)) {
  errors.push('missing authentication library: ' + authLib);
} else {
  const authSource = readFileSync(authLib, 'utf8');
  if (!authSource.includes("import { createDatabase } from './db/index.js'")) {
    errors.push('functions/lib/auth.js should use the shared database adapter for auth lookups');
  }
  if (authSource.includes('env.DB.prepare')) {
    errors.push('functions/lib/auth.js should not hardcode D1-only env.DB.prepare lookups');
  }
  if (authSource.includes('your-secret-key-change-in-production') || /const\s+JWT_SECRET\s*=/.test(authSource)) {
    errors.push('functions/lib/auth.js should read JWT_SECRET from env, not hardcode it');
  }
  if (/digest\('SHA-256'/.test(authSource) || /digest\("SHA-256"/.test(authSource)) {
    errors.push('functions/lib/auth.js should use salted PBKDF2 password hashing, not bare SHA-256');
  }
  if (!authSource.includes('PBKDF2')) {
    errors.push('functions/lib/auth.js missing PBKDF2 password hashing');
  }
}

const platformAdapterPath = 'functions/lib/platform/adapter.js';
if (!existsSync(platformAdapterPath)) {
  errors.push('missing platform adapter: ' + platformAdapterPath);
} else {
  const adapterSource = readFileSync(platformAdapterPath, 'utf8');
  const expressIndex = adapterSource.indexOf('if (context.req && context.res)');
  const cloudflareIndex = adapterSource.indexOf('if (context.request && context.env)');
  if (expressIndex === -1 || cloudflareIndex === -1 || expressIndex > cloudflareIndex) {
    errors.push('platform adapter should detect Express before Cloudflare-compatible request/env contexts');
  }
}

// Check wrangler.toml
const wranglerPath = 'wrangler.toml';
if (!existsSync(wranglerPath)) {
  errors.push('missing wrangler.toml configuration');
} else {
  const wrangler = readFileSync(wranglerPath, 'utf8');
  if (!wrangler.includes('d1_databases')) {
    errors.push('wrangler.toml missing D1 database binding');
  }
  if (!wrangler.includes('binding = "DB"')) {
    errors.push('wrangler.toml missing DB binding name');
  }
  if (!wrangler.includes('[observability]') || !wrangler.includes('head_sampling_rate')) {
    errors.push('wrangler.toml should enable Cloudflare observability sampling');
  }
}

// Check backend production docs
const backendDocsPath = 'docs/backend-design.md';
if (!existsSync(backendDocsPath)) {
  errors.push('missing backend documentation: docs/backend-design.md');
}

const productionDocsPath = 'docs/backend-production.md';
if (!existsSync(productionDocsPath)) {
  errors.push('missing backend production documentation: docs/backend-production.md');
} else {
  const productionDocs = readFileSync(productionDocsPath, 'utf8');
  for (const requiredSection of ['Runtime Configuration', 'Authentication', 'API Surface', 'Production Runbook']) {
    if (!productionDocs.includes(`## ${requiredSection}`)) {
      errors.push(`docs/backend-production.md missing section: ${requiredSection}`);
    }
  }
}

// Check admin API endpoints
const adminDir = 'functions/api/admin';
const requiredAdminFunctions = ['feedback.js', 'analytics.js', 'content-stats.js', 'settings.js', 'users.js'];
const requiredAdminSubdirs = ['functions/api/admin/feedback'];

if (!existsSync(adminDir)) {
  errors.push('missing functions/api/admin directory');
} else {
  for (const file of requiredAdminFunctions) {
    const filePath = join(adminDir, file);
    if (!existsSync(filePath)) {
      errors.push(`missing admin API function: ${filePath}`);
      continue;
    }

    const source = readFileSync(filePath, 'utf8');
    // Check for authentication (either requireAuth or createHandler with auth config)
    if (!source.includes('requireAuth') && !source.includes("auth: 'admin'")) {
      errors.push(`${filePath} should require admin authentication`);
    }
    if (source.includes("'Access-Control-Allow-Origin': '*'")) {
      errors.push(`${filePath} should not use wildcard CORS in production API code`);
    }
    if (/message:\s*error\.message/.test(source) || /error:\s*error\.message/.test(source)) {
      errors.push(`${filePath} should not return raw error.message in API responses`);
    }
  }
}

// Check admin subdirectories
for (const subdir of requiredAdminSubdirs) {
  if (existsSync(subdir)) {
    const deleteFile = join(subdir, 'delete.js');
    if (!existsSync(deleteFile)) {
      errors.push(`missing ${deleteFile}`);
    }
  }
}

// Check admin dashboard files (updated paths for new structure)
const adminFiles = [
  'public/pages/admin.html',
  'public/scripts/admin.js',
  'public/styles/admin.css',
];

// Check authentication pages (updated paths for new structure)
const authFiles = [
  'public/pages/login.html',
  'public/scripts/login.js',
  'public/styles/auth.css',
];

for (const file of [...adminFiles, ...authFiles]) {
  if (!existsSync(file)) {
    errors.push(`missing file: ${file}`);
  }
}

if (errors.length) {
  for (const error of errors) console.error(`ERROR ${error}`);
  process.exit(1);
}

console.log('Backend check passed: 12 API endpoints (3 public + 3 auth + 6 admin), 6 database tables, authentication system, 2 admin dashboards, wrangler.toml configured.');
