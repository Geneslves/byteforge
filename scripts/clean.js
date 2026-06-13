import { rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { isAbsolute, resolve, relative } from 'node:path';

const root = resolve('.');
const targets = [
  'dist',
  '.tmp-chrome-cdp-profile',
  '.tmp-chrome-cdp.pid',
  'preview-server.err.log',
  'preview-server.out.log',
  'dev-server.err.log',
  'dev-server.out.log',
];

const isInsideRoot = (targetPath) => {
  const relativePath = relative(root, targetPath);
  return relativePath && !relativePath.startsWith('..') && !isAbsolute(relativePath);
};

let removed = 0;

for (const target of targets) {
  const targetPath = resolve(root, target);

  if (!isInsideRoot(targetPath)) {
    throw new Error(`Refusing to clean outside project root: ${target}`);
  }

  if (!existsSync(targetPath)) continue;

  await rm(targetPath, { force: true, recursive: true });
  removed += 1;
  console.log(`Removed ${target}`);
}

if (!removed) console.log('No generated or temporary files to remove.');
