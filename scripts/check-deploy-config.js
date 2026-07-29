import { existsSync, readFileSync } from 'node:fs';

const errors = [];
const args = process.argv.slice(2);
const checkCloudflare = args.includes('--cloudflare') || process.env.BYTEFORGE_DEPLOY_TARGET === 'cloudflare';
const envPath = args.find((arg) => !arg.startsWith('--')) || process.env.BYTEFORGE_ENV_FILE || '';

const read = (path) => {
  if (!existsSync(path)) {
    errors.push(`missing deployment config file: ${path}`);
    return '';
  }
  return readFileSync(path, 'utf8');
};

const parseEnv = (source) => Object.fromEntries(source
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith('#'))
  .map((line) => {
    const separator = line.indexOf('=');
    if (separator === -1) return [line, ''];
    return [line.slice(0, separator), line.slice(separator + 1)];
  }));

const hasPlaceholder = (value) =>
  !value ||
  /^REPLACE_WITH_/i.test(value) ||
  /change-in-production/i.test(value) ||
  /byteforge_password/i.test(value) ||
  value === 'YOUR_D1_DATABASE_ID_HERE';

const requireEnv = (env, key) => {
  if (!(key in env)) {
    errors.push(`deployment env missing required key: ${key}`);
    return '';
  }
  return env[key];
};

if (!envPath) {
  errors.push('provide an env file path: node scripts/check-deploy-config.js infra/env/production.env');
} else {
  const env = parseEnv(read(envPath));

  for (const key of [
    'DEPLOY_ENV',
    'SITE_URL',
    'SITE_ORIGIN',
    'ALLOWED_ORIGINS',
    'REGISTRATION_ENABLED',
    'POSTGRES_USER',
    'POSTGRES_PASSWORD',
    'POSTGRES_DB',
    'JWT_SECRET',
  ]) {
    requireEnv(env, key);
  }

  for (const key of ['POSTGRES_PASSWORD', 'JWT_SECRET']) {
    const value = env[key] || '';
    if (hasPlaceholder(value)) errors.push(`${envPath} must replace placeholder ${key}`);
  }

  if ((env.JWT_SECRET || '').length < 32) {
    errors.push(`${envPath} JWT_SECRET must be at least 32 characters`);
  }

  if (!['true', 'false'].includes(env.REGISTRATION_ENABLED)) {
    errors.push(`${envPath} REGISTRATION_ENABLED must be "true" or "false"`);
  }

  for (const key of ['SITE_URL', 'SITE_ORIGIN']) {
    try {
      const url = new URL(env[key]);
      if (!['http:', 'https:'].includes(url.protocol)) {
        errors.push(`${envPath} ${key} must use http or https`);
      }
      if (url.pathname !== '/' || url.search || url.hash) {
        errors.push(`${envPath} ${key} must be an origin without path, query, or hash`);
      }
    } catch {
      errors.push(`${envPath} ${key} must be a valid URL origin`);
    }
  }

  for (const origin of (env.ALLOWED_ORIGINS || '').split(',').map((value) => value.trim()).filter(Boolean)) {
    try {
      new URL(origin);
    } catch {
      errors.push(`${envPath} ALLOWED_ORIGINS contains invalid origin: ${origin}`);
    }
  }
}

if (checkCloudflare) {
  const wrangler = read('wrangler.toml');
  if (wrangler.includes('database_id = "YOUR_D1_DATABASE_ID_HERE"')) {
    errors.push('wrangler.toml still contains the placeholder D1 database_id');
  }
  if (!wrangler.includes('REGISTRATION_ENABLED = "false"')) {
    errors.push('wrangler.toml should default REGISTRATION_ENABLED to "false"');
  }
}

if (errors.length) {
  for (const error of errors) console.error(`ERROR ${error}`);
  process.exit(1);
}

console.log(`Deployment config check passed: ${envPath}${checkCloudflare ? ' (cloudflare)' : ''}`);
