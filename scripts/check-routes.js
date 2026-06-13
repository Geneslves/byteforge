import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { planetRoutes, routeData } from '../src/data/content.js';

const errors = [];
const warnings = [];

const normalizeRoutePath = (value) => {
  if (!value) return null;
  const url = new URL(value, 'https://byteforge.dev');
  const pathname = url.pathname.replace(/\/$/, '') || '/';
  return pathname;
};

const normalizePlanetConfig = (label, config) => {
  if (typeof config === 'string') return { label, route: config, state: 'ready' };
  if (config && typeof config === 'object') return { label, ...config };
  return { label, route: null, state: 'future' };
};

const routes = new Set(Object.keys(routeData));
const routeEntries = Object.entries(routeData);
const planetConfigs = Object.entries(planetRoutes).map(([label, config]) =>
  normalizePlanetConfig(label, config)
);

for (const [routePath, config] of routeEntries) {
  if (!routePath.startsWith('/')) {
    errors.push(`routeData key must start with "/": ${routePath}`);
  }
  if (routePath !== '/' && routePath.endsWith('/')) {
    errors.push(`routeData key should not include trailing slash: ${routePath}`);
  }
  if (!config.title || !config.kicker || !config.summary) {
    errors.push(`routeData entry is missing title/kicker/summary: ${routePath}`);
  }

  for (const entry of config.entries || []) {
    const hrefPath = normalizeRoutePath(entry.href);
    if (hrefPath && hrefPath !== '/' && !routes.has(hrefPath)) {
      errors.push(`entry "${entry.id}" links to unknown route: ${entry.href}`);
    }
  }
}

for (const config of planetConfigs) {
  const state = config.state || (config.route ? 'ready' : 'future');
  const route = normalizeRoutePath(config.route);
  const isInteractive = route && !['future', 'disabled'].includes(state);

  if (isInteractive && !routes.has(route)) {
    errors.push(`planet "${config.label}" points to missing route: ${config.route}`);
  }
  if (!config.collection) {
    warnings.push(`planet "${config.label}" has no collection metadata`);
  }
}

const html = readFileSync('index.html', 'utf8');
const planetLabels = [...html.matchAll(/class="planet"[^>]*aria-label="([^"]+)"/g)].map((match) => match[1]);
const configuredLabels = new Set(planetConfigs.map((config) => config.label));

for (const label of planetLabels) {
  if (!configuredLabels.has(label)) {
    errors.push(`HTML planet has no planetRoutes config: ${label}`);
  }
}

const sitemap = existsSync('public/sitemap.xml') ? readFileSync('public/sitemap.xml', 'utf8') : '';
for (const routePath of routes) {
  const publicPath = routePath === '/' ? '/' : `${routePath}/`;
  if (!sitemap.includes(`https://byteforge.dev${publicPath}`)) {
    errors.push(`sitemap is missing route: ${publicPath}`);
  }
}

if (existsSync('dist/index.html')) {
  for (const routePath of routes) {
    if (routePath === '/') continue;
    const staticEntry = join('dist', routePath.slice(1), 'index.html');
    if (!existsSync(staticEntry)) {
      errors.push(`dist is missing static entry: ${staticEntry}`);
    }
  }
  if (!existsSync('dist/og-image.svg')) {
    errors.push('dist is missing og-image.svg');
  }
}

for (const warning of warnings) console.warn(`WARN ${warning}`);

if (errors.length) {
  for (const error of errors) console.error(`ERROR ${error}`);
  process.exit(1);
}

console.log(`Route check passed: ${routes.size} routes, ${planetConfigs.length} planet configs.`);
