import { readdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { isAbsolute, resolve, relative, join } from 'node:path';

const root = resolve('.');
const targets = [
  'dist',
  '.tmp-chrome-cdp-profile',
  '.tmp-chrome-cdp.pid',
  'preview-server.err.log',
  'preview-server.out.log',
  'dev-server.err.log',
  'dev-server.out.log',
  '.vite-dev.err.log',
  '.vite-dev.out.log',
];
const emptiedDirs = [
  'runtime/tmp',
  'runtime/logs',
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

for (const dir of emptiedDirs) {
  const dirPath = resolve(root, dir);
  if (!existsSync(dirPath)) continue;
  if (!isInsideRoot(dirPath)) {
    throw new Error(`Refusing to clean outside project root: ${dir}`);
  }

  for (const entry of await readdir(dirPath)) {
    if (entry === '.gitkeep') continue;
    const entryPath = join(dirPath, entry);
    if (!isInsideRoot(entryPath)) {
      throw new Error(`Refusing to clean outside project root: ${entryPath}`);
    }
    await rm(entryPath, { force: true, recursive: true });
    removed += 1;
    console.log(`Removed ${dir}/${entry}`);
  }
}

if (!removed) console.log('No generated or temporary files to remove.');
