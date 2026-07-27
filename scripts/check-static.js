import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { contentDocuments, routeData } from '../src/data/index.js';

const errors = [];
const distDir = 'dist';
const assetPattern = /\/assets\/[^"]+\.(css|js)/g;

const requireFile = (filePath) => {
  if (!existsSync(filePath)) {
    errors.push(`missing build artifact: ${filePath}`);
    return false;
  }
  return true;
};

const checkHtml = (filePath, routePath = '/') => {
  if (!requireFile(filePath)) return;

  const html = readFileSync(filePath, 'utf8');
  if (!html.startsWith('<!DOCTYPE html>')) errors.push(`build artifact is not an HTML document: ${filePath}`);
  if (html.includes('/src/main.js') || html.includes('/src/styles/')) {
    errors.push(`build artifact still references source paths: ${filePath}`);
  }

  const assets = [...html.matchAll(assetPattern)].map((match) => match[0].slice(1));
  const hasCss = assets.some((asset) => asset.endsWith('.css'));
  const hasJs = assets.some((asset) => asset.endsWith('.js'));

  if (!hasCss) errors.push(`build artifact has no bundled CSS link: ${filePath}`);
  if (!hasJs) errors.push(`build artifact has no bundled JS module: ${filePath}`);

  for (const asset of assets) {
    requireFile(join(distDir, asset));
  }

  if (routePath !== '/') {
    const canonicalUrl = `https://byteforge.dev${routePath}/`;
    if (!html.includes(`<link rel="canonical" href="${canonicalUrl}" />`)) {
      errors.push(`route artifact has incorrect canonical URL: ${filePath}`);
    }
  }
};

checkHtml(join(distDir, 'index.html'));

for (const routePath of Object.keys(routeData)) {
  const routeDir = routePath.slice(1);
  if (!routeDir) continue;
  checkHtml(join(distDir, routeDir, 'index.html'), routePath);
}

for (const document of contentDocuments) {
  checkHtml(join(distDir, document.path.slice(1), 'index.html'), document.path);
}

requireFile(join(distDir, 'audio', 'ink-wash-terminal.mp3'));
requireFile(join(distDir, 'og-image.svg'));
requireFile(join(distDir, 'manifest.json'));
requireFile(join(distDir, 'rss.xml'));
requireFile(join(distDir, 'images', 'relay-station.svg'));

const navPagePath = join(distDir, 'pages', 'nav.html');
if (requireFile(navPagePath)) {
  const navHtml = readFileSync(navPagePath, 'utf8');
  for (const relayOrigin of ['https://sub2api.thebyte.tech', 'https://cpa.thebyte.tech']) {
    if (!navHtml.includes(`href="${relayOrigin}"`)) errors.push(`${navPagePath} is missing relay entry: ${relayOrigin}`);
  }
  if (!navHtml.includes('/images/relay-station.svg')) errors.push(`${navPagePath} is missing the relay station logo`);
  if ((navHtml.match(/rel="noopener noreferrer"/g) || []).length < 2) {
    errors.push(`${navPagePath} relay entries should isolate their external browsing contexts`);
  }
}


const searchIndexPath = join(distDir, 'search-index.json');
if (requireFile(searchIndexPath)) {
  try {
    const searchIndex = JSON.parse(readFileSync(searchIndexPath, 'utf8'));
    if (!Array.isArray(searchIndex.documents) || searchIndex.documents.length === 0) {
      errors.push('search-index.json should include documents');
    }
    if (!searchIndex.facets?.tags?.length || !searchIndex.facets?.categories?.length || !searchIndex.facets?.series?.length) {
      errors.push('search-index.json should include tag, category and series facets');
    }
    if (!searchIndex.pagefind?.filters?.includes('tag')) {
      errors.push('search-index.json should include Pagefind filter metadata');
    }
  } catch (error) {
    errors.push(`search-index.json is not valid JSON: ${error.message}`);
  }
}

// Check Pagefind build artifacts
const pagefindFiles = [
  'pagefind/pagefind.js',
  'pagefind/pagefind-entry.json',
  'pagefind/pagefind-ui.js',
  'pagefind/pagefind-ui.css',
];

for (const file of pagefindFiles) {
  const filePath = join(distDir, file);
  if (!existsSync(filePath)) {
    errors.push(`missing pagefind artifact: ${filePath}`);
  }
}

if (errors.length) {
  for (const error of errors) console.error(`ERROR ${error}`);
  process.exit(1);
}

console.log(`Static build check passed: ${Object.keys(routeData).length + contentDocuments.length + 1} HTML entry points, Pagefind index generated.`);
