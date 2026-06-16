import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const database = process.argv.slice(2).find((arg) => !arg.startsWith('--')) || 'byteforge';
const persistTo = '.wrangler/state';
const wrangler = process.platform === 'win32'
  ? join('node_modules', '.bin', 'wrangler.cmd')
  : join('node_modules', '.bin', 'wrangler');
const resetFile = join('runtime', 'tmp', 'd1-reset-local.sql');
const localD1StateDir = join('.wrangler', 'state', 'v3', 'd1');
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

const dropSql = `
DROP TABLE IF EXISTS schema_migrations;
DROP TABLE IF EXISTS content_events;
DROP TABLE IF EXISTS feedback;
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS rate_limits;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS users;
`;

const runWrangler = (args, label) => {
  const command = process.platform === 'win32' ? 'cmd.exe' : wrangler;
  const commandArgs = process.platform === 'win32' ? ['/d', '/c', wrangler, ...args] : args;
  const result = spawnSync(command, commandArgs, {
    cwd: process.cwd(),
    env: wranglerEnv,
    encoding: 'utf8',
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status}`);
  }
};

mkdirSync(dirname(resetFile), { recursive: true });
mkdirSync(wranglerEnv.XDG_CONFIG_HOME, { recursive: true });
mkdirSync(wranglerEnv.XDG_CACHE_HOME, { recursive: true });
mkdirSync(wranglerEnv.XDG_STATE_HOME, { recursive: true });
mkdirSync(wranglerEnv.WRANGLER_REGISTRY_PATH, { recursive: true });
mkdirSync(wranglerEnv.WRANGLER_LOG_PATH, { recursive: true });
writeFileSync(resetFile, dropSql);

if (existsSync(localD1StateDir)) {
  rmSync(localD1StateDir, { recursive: true, force: true });
}

console.log(`Resetting local D1 database: ${database}`);
runWrangler(['d1', 'execute', database, '--local', '--persist-to', persistTo, '--file', resetFile], 'Drop existing local tables');
runWrangler(['d1', 'execute', database, '--local', '--persist-to', persistTo, '--file', 'schema/d1.sql'], 'Apply baseline schema');
runWrangler(['d1', 'execute', database, '--local', '--persist-to', persistTo, '--file', 'schema/seed.sql'], 'Apply seed data');
console.log('Local D1 reset complete.');
