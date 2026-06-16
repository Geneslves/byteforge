import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { documentRoutes, planetRoutes, routeData } from '../src/data/index.js';

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

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char]);

const routes = new Set(Object.keys(routeData));
const contentRoutes = new Set([...routes, ...Object.keys(documentRoutes)]);
const publicStaticRoutes = new Set(['/login.html', '/nav.html', '/admin.html', '/admin-v2.html']);
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
    if (hrefPath && hrefPath !== '/' && !contentRoutes.has(hrefPath)) {
      errors.push(`entry "${entry.id}" links to unknown route: ${entry.href}`);
    }
  }
}

for (const [routePath, document] of Object.entries(documentRoutes)) {
  if (!routePath.startsWith('/documents/')) {
    errors.push(`document route should live under /documents/: ${routePath}`);
  }
  if (document.path !== routePath) {
    errors.push(`document route key should match document.path: ${routePath}`);
  }
  if (!document.url || normalizeRoutePath(document.url) !== routePath) {
    errors.push(`document route should expose a matching URL: ${routePath}`);
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
const navHtml = html.match(/<nav class="cli-nav">[\s\S]*?<\/nav>/)?.[0] || '';
const navRoutes = [...navHtml.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map((match) =>
  normalizeRoutePath(match[1])
);

for (const label of planetLabels) {
  if (!configuredLabels.has(label)) {
    errors.push(`HTML planet has no planetRoutes config: ${label}`);
  }
}

for (const routePath of navRoutes) {
  if (routePath && routePath !== '/' && !routes.has(routePath) && !publicStaticRoutes.has(routePath)) {
    errors.push(`CLI nav links to unknown route: ${routePath}`);
  }
}

const routingModule = readFileSync('src/modules/routing.js', 'utf8');
if (!routingModule.includes("link.addEventListener('click', (event) => {")) {
  errors.push('CLI nav links must be intercepted by SPA routing instead of forcing a full page reload');
}

const sitemap = existsSync('public/sitemap.xml') ? readFileSync('public/sitemap.xml', 'utf8') : '';
for (const routePath of routes) {
  const publicPath = routePath === '/' ? '/' : `${routePath}/`;
  if (!sitemap.includes(`https://byteforge.dev${publicPath}`)) {
    errors.push(`sitemap is missing route: ${publicPath}`);
  }
}

if (existsSync('dist/index.html')) {
  for (const [routePath, config] of routeEntries) {
    if (routePath === '/') continue;
    const staticEntry = join('dist', routePath.slice(1), 'index.html');
    if (!existsSync(staticEntry)) {
      errors.push(`dist is missing static entry: ${staticEntry}`);
      continue;
    }

    const routeHtml = readFileSync(staticEntry, 'utf8');
    const publicPath = `${routePath}/`;
    const canonicalUrl = `https://byteforge.dev${publicPath}`;
    const routeTitle = escapeHtml(`${config.title} - ByteForge`);
    const routeDescription = escapeHtml(config.summary);

    if (!routeHtml.includes(`<title>${routeTitle}</title>`)) {
      errors.push(`dist route has incorrect title: ${staticEntry}`);
    }
    if (!routeHtml.includes(`<link rel="canonical" href="${canonicalUrl}" />`)) {
      errors.push(`dist route has incorrect canonical URL: ${staticEntry}`);
    }
    if (!routeHtml.includes(`<meta property="og:url" content="${canonicalUrl}" />`)) {
      errors.push(`dist route has incorrect og:url: ${staticEntry}`);
    }
    if (!routeHtml.includes(`<meta name="twitter:url" content="${canonicalUrl}" />`)) {
      errors.push(`dist route has incorrect twitter:url: ${staticEntry}`);
    }
    if (!routeHtml.includes(`<meta name="description" content="${routeDescription}" />`)) {
      errors.push(`dist route has incorrect description: ${staticEntry}`);
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

console.log(`Route check passed: ${routes.size} routes, ${Object.keys(documentRoutes).length} document routes, ${planetConfigs.length} planet configs.`);
