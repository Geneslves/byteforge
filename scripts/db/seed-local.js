import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const database = process.argv.slice(2).find((arg) => !arg.startsWith('--')) || 'byteforge';
const persistTo = '.wrangler/state';
const wrangler = process.platform === 'win32'
  ? join('node_modules', '.bin', 'wrangler.cmd')
  : join('node_modules', '.bin', 'wrangler');
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
mkdirSync(wranglerEnv.XDG_CONFIG_HOME, { recursive: true });
mkdirSync(wranglerEnv.XDG_CACHE_HOME, { recursive: true });
mkdirSync(wranglerEnv.XDG_STATE_HOME, { recursive: true });
mkdirSync(wranglerEnv.WRANGLER_REGISTRY_PATH, { recursive: true });
mkdirSync(wranglerEnv.WRANGLER_LOG_PATH, { recursive: true });

const args = [
  'd1',
  'execute',
  database,
  '--local',
  '--persist-to',
  persistTo,
  '--file',
  'schema/seed.sql',
];
const command = process.platform === 'win32' ? 'cmd.exe' : wrangler;
const commandArgs = process.platform === 'win32' ? ['/d', '/c', wrangler, ...args] : args;
const result = spawnSync(command, commandArgs, {
  cwd: process.cwd(),
  env: wranglerEnv,
  encoding: 'utf8',
  stdio: 'inherit',
});

if (result.status !== 0) {
  throw new Error(`Seed failed with exit code ${result.status}`);
}

console.log(`Local D1 seed applied to ${database}.`);
