import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { build } from 'vite';
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

const withRouteHead = (html, routePath, config, documentData = null) => {
  const publicPath = `${routePath}/`;
  const canonicalUrl = `https://byteforge.dev${publicPath}`;
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
      "url": `https://byteforge.dev${documentData.url}`,
      "keywords": documentData.tags.join(', '),
      "author": {
        "@type": "Person",
        "name": "ByteForge"
      }
    };

    const jsonLdScript = `\n  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`;
    result = result.replace('</head>', `${jsonLdScript}\n  </head>`);
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
    <link>https://byteforge.dev/</link>
    <description>ByteForge content document feed</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${rssItems.map((item) => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.url)}</link>
      <description>${escapeXml(item.description)}</description>
      <pubDate>${escapeXml(item.pubDate)}</pubDate>
      <guid>${escapeXml(item.guid)}</guid>
    </item>`).join('\n')}
  </channel>
</rss>
`;

await writeFile(join(distDir, 'rss.xml'), rssXml);

await writeFile(join(distDir, 'search-index.json'), `${JSON.stringify({
  pagefind: pagefindIndexConfig,
  facets: searchFacets,
  documents: searchIndexDocuments,
}, null, 2)}\n`);

console.log(`Generated static route entries: ${routePaths.map((routePath) => `/${routePath}/`).join(', ')}`);
console.log(`Generated document entries: ${contentDocuments.length}`);
console.log(`Generated RSS feed: ${rssItems.length} items`);
console.log(`Generated search index: ${searchIndexDocuments.length} documents`);

// Generate sitemap
const baseUrl = 'https://byteforge.dev';
const sitemapUrls = [
  { loc: `${baseUrl}/`, priority: '1.0', changefreq: 'weekly' },
  ...routeEntries.map(([path]) => ({
    loc: `${baseUrl}${path}/`,
    priority: '0.8',
    changefreq: 'weekly'
  })),
  ...contentDocuments.map(doc => ({
    loc: `${baseUrl}${doc.url}`,
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

