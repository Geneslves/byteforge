import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { routeData } from '../src/data/content.js';

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

requireFile(join(distDir, 'audio', 'ink-wash-terminal.mp3'));
requireFile(join(distDir, 'og-image.svg'));
requireFile(join(distDir, 'manifest.json'));

if (errors.length) {
  for (const error of errors) console.error(`ERROR ${error}`);
  process.exit(1);
}

console.log(`Static build check passed: ${Object.keys(routeData).length + 1} HTML entry points.`);
