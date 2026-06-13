import { readdirSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const roots = ['src', 'scripts'];
const errors = [];
const sourceFiles = [];
const forbiddenDebugger = new RegExp(`\\b${['de', 'bugger'].join('')}\\b`);
const unfinishedMarker = new RegExp(['TO', 'DO|FIX', 'ME|HA', 'CK'].join(''));

const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const filePath = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(filePath);
    } else if (['.js', '.cjs'].includes(extname(entry.name))) {
      sourceFiles.push(filePath);
    }
  }
};

for (const root of roots) walk(root);

for (const filePath of sourceFiles) {
  const result = spawnSync(process.execPath, ['--check', filePath], { encoding: 'utf8' });
  if (result.status !== 0) {
    errors.push(`syntax check failed: ${filePath}\n${result.stderr.trim()}`);
  }

  const source = readFileSync(filePath, 'utf8');
  if (forbiddenDebugger.test(source)) errors.push(`debug statement found: ${filePath}`);
  if (unfinishedMarker.test(source)) errors.push(`unfinished marker found: ${filePath}`);

  if (filePath.startsWith('src') && /\bconsole\.(log|debug|info|warn|error)\b/.test(source)) {
    errors.push(`console call found in browser source: ${filePath}`);
  }
}

if (errors.length) {
  for (const error of errors) console.error(`ERROR ${error}`);
  process.exit(1);
}

console.log(`Source check passed: ${sourceFiles.length} JavaScript files.`);
