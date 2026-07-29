import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { build } from 'vite';
import { siteUrl } from '../site.config.js';
import {
  contentDocuments,
  pagefindIndexConfig,
  routeData,
  rssItems,
  searchFacets,
  searchIndexDocuments,
} from '../src/data/index.js';

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

const escapeXml = escapeAttribute;

const buildPagefindDocument = (documentData) => {
  if (!documentData) return '';

  const tagFilters = (documentData.tags || [])
    .map((tag) => `<span data-pagefind-filter="tag">${escapeAttribute(tag)}</span>`)
    .join('');

  return `
  <article class="pagefind-static-document" data-pagefind-body aria-hidden="true" style="position:absolute;left:-10000px;top:auto;width:1px;height:1px;overflow:hidden;">
    <h1>${escapeAttribute(documentData.title)}</h1>
    <p>${escapeAttribute(documentData.summary)}</p>
    <span data-pagefind-filter="collection">${escapeAttribute(documentData.collection)}</span>
    <span data-pagefind-filter="category">${escapeAttribute(documentData.category)}</span>
    <span data-pagefind-filter="series">${escapeAttribute(documentData.series)}</span>
    ${tagFilters}
    ${documentData.body.split(/\n\n+/).map((paragraph) => `<p>${escapeAttribute(paragraph)}</p>`).join('\n    ')}
  </article>`;
};

const withRouteHead = (html, routePath, config, documentData = null) => {
  const publicPath = `${routePath}/`;
  const canonicalUrl = siteUrl(publicPath);
  const title = `${config.title} - ByteForge`;
  const description = config.summary;

  let result = html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeAttribute(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${escapeAttribute(description)}" />`)
    .replace(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${canonicalUrl}" />`)
    .replace(/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${canonicalUrl}" />`)
    .replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${escapeAttribute(title)}" />`)
    .replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${escapeAttribute(description)}" />`)
    .replace(/<meta name="twitter:url" content="[^"]*" \/>/, `<meta name="twitter:url" content="${canonicalUrl}" />`)
    .replace(/<meta name="twitter:title" content="[^"]*" \/>/, `<meta name="twitter:title" content="${escapeAttribute(title)}" />`)
    .replace(/<meta name="twitter:description" content="[^"]*" \/>/, `<meta name="twitter:description" content="${escapeAttribute(description)}" />`);

  // Add JSON-LD for document detail pages
  if (documentData) {
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": documentData.title,
      "description": documentData.summary,
      "datePublished": documentData.publishedAt,
      "url": siteUrl(documentData.url),
      "keywords": documentData.tags.join(', '),
      "author": {
        "@type": "Person",
        "name": "ByteForge"
      }
    };

    const jsonLdScript = `\n  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`;
    result = result.replace('</head>', `${jsonLdScript}\n  </head>`);
    result = result.replace('</body>', `${buildPagefindDocument(documentData)}\n</body>`);
  }

  return result;
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

await Promise.all(contentDocuments.map(async (document) => {
  const routeDir = join(distDir, document.path.replace(/^\//, ''));
  await mkdir(routeDir, { recursive: true });
  await writeFile(join(routeDir, 'index.html'), withRouteHead(baseHtml, document.path, {
    title: document.title,
    summary: document.summary,
  }, document));
}));

const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>ByteForge</title>
    <link>${siteUrl('/')}</link>
    <description>ByteForge content document feed</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${rssItems.map((item) => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(siteUrl(item.url))}</link>
      <description>${escapeXml(item.description)}</description>
      <pubDate>${escapeXml(item.pubDate)}</pubDate>
      <guid isPermaLink="false">${escapeXml(item.guid)}</guid>
    </item>`).join('\n')}
  </channel>
</rss>
`;

await writeFile(join(distDir, 'rss.xml'), rssXml);
await writeFile(join(distDir, 'robots.txt'), `# https://www.robotstxt.org/robotstxt.html
User-agent: *
Allow: /

# Sitemap
Sitemap: ${siteUrl('/sitemap.xml')}

# Resources that should not be indexed
Disallow: /dist/
Disallow: /node_modules/
Disallow: /.git/
`);

await writeFile(join(distDir, 'search-index.json'), `${JSON.stringify({
  pagefind: pagefindIndexConfig,
  facets: searchFacets,
  documents: searchIndexDocuments,
}, null, 2)}\n`);

await writeFile(join(distDir, 'route-manifest.json'), `${JSON.stringify({
  spaRoutes: [
    '/',
    ...routeEntries.map(([routePath]) => routePath),
    ...contentDocuments.map((document) => document.path),
  ],
}, null, 2)}\n`);

console.log(`Generated static route entries: ${routePaths.map((routePath) => `/${routePath}/`).join(', ')}`);
console.log(`Generated document entries: ${contentDocuments.length}`);
console.log(`Generated RSS feed: ${rssItems.length} items`);
console.log(`Generated search index: ${searchIndexDocuments.length} documents`);

// Generate sitemap
const sitemapUrls = [
  { loc: siteUrl('/'), priority: '1.0', changefreq: 'weekly' },
  ...routeEntries.map(([path]) => ({
    loc: siteUrl(`${path}/`),
    priority: '0.8',
    changefreq: 'weekly'
  })),
  ...contentDocuments.map(doc => ({
    loc: siteUrl(doc.url),
    lastmod: doc.publishedAt,
    priority: '0.6',
    changefreq: 'monthly'
  }))
];

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.map(u => `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>\n    ` : ''}<changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;

await writeFile(join(distDir, 'sitemap.xml'), sitemapXml);
console.log(`Generated sitemap: ${sitemapUrls.length} URLs`);
