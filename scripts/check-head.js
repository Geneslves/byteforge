import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const distDir = 'dist';
const errors = [];

const requiredMetaTags = [
  '<title>',
  '<meta name="description"',
  '<link rel="canonical"',
  '<meta property="og:title"',
  '<meta property="og:description"',
  '<meta property="og:url"',
  '<meta name="twitter:title"',
  '<meta name="twitter:description"',
];

const checkHtml = (filePath, expectJsonLd = false) => {
  if (!existsSync(filePath)) {
    errors.push(`missing file: ${filePath}`);
    return;
  }

  const html = readFileSync(filePath, 'utf8');
  const relativePath = filePath.replace(/\\/g, '/').replace(`${distDir}/`, '');

  for (const tag of requiredMetaTags) {
    if (!html.includes(tag)) {
      errors.push(`${relativePath} missing: ${tag}`);
    }
  }

  // Document detail pages should contain JSON-LD
  if (expectJsonLd && !html.includes('<script type="application/ld+json">')) {
    errors.push(`${relativePath} missing JSON-LD structured data`);
  }

  if (expectJsonLd) {
    const scripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    const articleScript = scripts.find((script) =>
      script[1].includes('"@type":"Article"') || script[1].includes('"@type": "Article"')
    );
    if (articleScript) {
      try {
        const structuredData = JSON.parse(articleScript[1]);
        for (const field of ['@context', '@type', 'headline', 'description', 'datePublished', 'url']) {
          if (!structuredData[field]) errors.push(`${relativePath} JSON-LD missing ${field}`);
        }
      } catch (error) {
        errors.push(`${relativePath} JSON-LD is not valid JSON: ${error.message}`);
      }
    } else {
      errors.push(`${relativePath} missing Article JSON-LD structured data`);
    }

    for (const filter of ['collection', 'category', 'series', 'tag']) {
      if (!html.includes(`data-pagefind-filter="${filter}"`)) {
        errors.push(`${relativePath} missing Pagefind ${filter} filter source`);
      }
    }
  }
};

// Check homepage
checkHtml(join(distDir, 'index.html'));

// Check route pages
const routeDirs = ['logs', 'deployments', 'archive', 'search', 'dev-ai', 'snippets', 'academic'];
for (const dir of routeDirs) {
  checkHtml(join(distDir, dir, 'index.html'));
}

// Check document detail pages
const documentsDir = join(distDir, 'documents');
if (existsSync(documentsDir)) {
  const documentIds = readdirSync(documentsDir);
  for (const id of documentIds) {
    checkHtml(join(documentsDir, id, 'index.html'), true);
  }
}

if (errors.length) {
  for (const error of errors) console.error(`ERROR ${error}`);
  process.exit(1);
}

console.log('Head metadata check passed: all required meta tags present, JSON-LD on document pages.');
