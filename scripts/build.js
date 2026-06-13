import { cp, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { build } from 'vite';
import { routeData } from '../src/content.js';

const distDir = 'dist';
const routePaths = Object.keys(routeData)
  .map((routePath) => routePath.replace(/^\//, ''))
  .filter(Boolean);

await build();

await Promise.all(routePaths.map(async (routePath) => {
  const routeDir = join(distDir, routePath);
  await mkdir(routeDir, { recursive: true });
  await cp(join(distDir, 'index.html'), join(routeDir, 'index.html'));
}));

console.log(`Generated static route entries: ${routePaths.map((routePath) => `/${routePath}/`).join(', ')}`);
