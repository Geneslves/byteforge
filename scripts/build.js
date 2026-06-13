import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { build } from 'vite';
import { routeData } from '../src/data/content.js';

const distDir = 'dist';
const routeEntries = Object.entries(routeData);
const routePaths = routeEntries.map(([routePath]) => routePath.replace(/^\//, '')).filter(Boolean);

const escapeAttribute = (value) =>
  String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char]);

const withRouteHead = (html, routePath, config) => {
  const publicPath = `${routePath}/`;
  const canonicalUrl = `https://byteforge.dev${publicPath}`;
  const title = `${config.title} - ByteForge`;
  const description = config.summary;

  return html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeAttribute(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${escapeAttribute(description)}" />`)
    .replace(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${canonicalUrl}" />`)
    .replace(/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${canonicalUrl}" />`)
    .replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${escapeAttribute(title)}" />`)
    .replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${escapeAttribute(description)}" />`)
    .replace(/<meta name="twitter:url" content="[^"]*" \/>/, `<meta name="twitter:url" content="${canonicalUrl}" />`)
    .replace(/<meta name="twitter:title" content="[^"]*" \/>/, `<meta name="twitter:title" content="${escapeAttribute(title)}" />`)
    .replace(/<meta name="twitter:description" content="[^"]*" \/>/, `<meta name="twitter:description" content="${escapeAttribute(description)}" />`);
};

await build();

const baseHtml = await readFile(join(distDir, 'index.html'), 'utf8');

await Promise.all(routeEntries.map(async ([routePath, config]) => {
  const routeDirName = routePath.replace(/^\//, '');
  if (!routeDirName) return;

  const routeDir = join(distDir, routeDirName);
  await mkdir(routeDir, { recursive: true });
  await writeFile(join(routeDir, 'index.html'), withRouteHead(baseHtml, routePath, config));
}));

console.log(`Generated static route entries: ${routePaths.map((routePath) => `/${routePath}/`).join(', ')}`);
