import { cp, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { build } from 'vite';

const distDir = 'dist';
const routePaths = ['logs', 'deployments', 'search'];

await build();

await Promise.all(routePaths.map(async (routePath) => {
  const routeDir = join(distDir, routePath);
  await mkdir(routeDir, { recursive: true });
  await cp(join(distDir, 'index.html'), join(routeDir, 'index.html'));
}));

console.log(`Generated static route entries: ${routePaths.map((routePath) => `/${routePath}/`).join(', ')}`);
