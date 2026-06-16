import { readFileSync } from 'node:fs';

const filesToCheck = [
  'package.json',
  'src/data/content-model.js',
  'src/data/routes.js',
  'src/data/planets.js',
  'src/data/collections/logs.js',
  'src/data/collections/deployments.js',
  'src/data/collections/archive.js',
  'docs/implementation-plan.md',
];

const errors = [];
const mojibakePattern = /锛|銆|乣|鈥|�|€|||鎬ц|浼樺|瀹屾|绉诲|鍐呭|璺|椤圭|闃舵/;

for (const filePath of filesToCheck) {
  const source = readFileSync(filePath, 'utf8');
  const lines = source.split(/\r?\n/);

  lines.forEach((line, index) => {
    if (mojibakePattern.test(line)) {
      errors.push(`${filePath}:${index + 1} appears to contain mojibake text`);
    }
  });
}

const {
  archiveIndex,
  allContentEntries,
  contentDocuments,
  contentCollections,
  documentRoutes,
  pagefindIndexConfig,
  publicContentEntries,
  routeData,
  rssItems,
  searchEntries,
  searchFacets,
  searchIndexDocuments,
} = await import('../src/data/index.js');

if (!Array.isArray(allContentEntries) || allContentEntries.length === 0) {
  errors.push('allContentEntries export should include every source entry before publication filtering');
}

if (!Array.isArray(publicContentEntries) || publicContentEntries.length === 0) {
  errors.push('publicContentEntries export should include only published entries');
}

const publicIds = new Set((publicContentEntries || []).map((entry) => entry.id));
const nonPublishedIds = new Set((allContentEntries || [])
  .filter((entry) => entry.status !== 'published')
  .map((entry) => entry.id));

for (const entry of publicContentEntries || []) {
  if (entry.status !== 'published') {
    errors.push(`publicContentEntries should only include published entries; found ${entry.id} with ${entry.status}`);
  }
}

for (const [collection, entries] of Object.entries(contentCollections)) {
  if (!Array.isArray(entries) || entries.length === 0) {
    errors.push(`content collection "${collection}" should contain entries`);
    continue;
  }

  for (const entry of entries) {
    for (const field of ['id', 'meta', 'title', 'text', 'href']) {
      if (typeof entry[field] !== 'string' || !entry[field].trim()) {
        errors.push(`content entry "${collection}.${entry.id || 'unknown'}" is missing string field "${field}"`);
      }
    }
    if (!Array.isArray(entry.tags) || entry.tags.length === 0) {
      errors.push(`content entry "${collection}.${entry.id || 'unknown'}" should include tags`);
    }

    // Validate status field
    if (!['draft', 'published', 'archived'].includes(entry.status)) {
      errors.push(`content entry "${collection}.${entry.id || 'unknown'}" has invalid status: ${entry.status}`);
    }

    // Validate type field
    if (typeof entry.type !== 'string' || !entry.type.trim()) {
      errors.push(`content entry "${collection}.${entry.id || 'unknown'}" missing type field`);
    }
  }
}

for (const [routePath, config] of Object.entries(routeData)) {
  for (const field of ['kicker', 'title', 'summary']) {
    if (typeof config[field] !== 'string' || !config[field].trim()) {
      errors.push(`route "${routePath}" is missing string field "${field}"`);
    }
  }
  if (routePath === '/search') {
    if (config.collection !== 'all') {
      errors.push('route "/search" should declare collection "all"');
    }
  } else if (!contentCollections[config.collection]) {
    errors.push(`route "${routePath}" should declare a collection from contentCollections`);
  }
  if (typeof config.description !== 'string' || !config.description.trim()) {
    errors.push(`route "${routePath}" is missing display description`);
  }
  if (!Array.isArray(config.entries) || config.entries.length === 0) {
    errors.push(`route "${routePath}" should include entries`);
  }
}

if (routeData['/archive']?.collection !== 'archive') {
  errors.push('route "/archive" should expose the archive collection');
}

if (!archiveIndex || typeof archiveIndex !== 'object') {
  errors.push('archiveIndex export is missing');
} else {
  for (const field of ['timeline', 'categories', 'series', 'tags']) {
    if (!Array.isArray(archiveIndex[field]) || archiveIndex[field].length === 0) {
      errors.push(`archiveIndex.${field} should contain grouped archive data`);
    }
  }
}

const searchIds = new Set();
for (const entry of searchEntries) {
  if (!publicIds.has(entry.id)) {
    errors.push(`search entry "${entry.id}" should come from publicContentEntries`);
  }
  if (nonPublishedIds.has(entry.id)) {
    errors.push(`non-published entry "${entry.id}" leaked into searchEntries`);
  }
  if (searchIds.has(entry.id)) errors.push(`duplicate search entry id: ${entry.id}`);
  searchIds.add(entry.id);
  if (typeof entry.collection !== 'string' || !entry.collection.trim()) {
    errors.push(`search entry "${entry.id}" is missing collection`);
  }
  if (entry.href !== `/documents/${entry.id}/`) {
    errors.push(`search entry "${entry.id}" should link to its document route`);
  }
  for (const field of ['category', 'series', 'searchableText']) {
    if (typeof entry[field] !== 'string' || !entry[field].trim()) {
      errors.push(`search entry "${entry.id}" is missing ${field}`);
    }
  }
}

if (!Array.isArray(contentDocuments) || contentDocuments.length !== searchEntries.length) {
  errors.push('contentDocuments should mirror searchEntries');
} else {
  for (const document of contentDocuments) {
    for (const field of ['id', 'path', 'url', 'title', 'summary', 'body', 'collection', 'category', 'series', 'publishedAt']) {
      if (typeof document[field] !== 'string' || !document[field].trim()) {
        errors.push(`content document "${document.id || 'unknown'}" is missing ${field}`);
      }
    }
    if (document.path !== `/documents/${document.id}` || document.url !== `/documents/${document.id}/`) {
      errors.push(`content document "${document.id}" should use the /documents/<id>/ URL shape`);
    }
    if (!Array.isArray(document.tags) || document.tags.length === 0) {
      errors.push(`content document "${document.id}" should include tags`);
    }
  }
}

if (!documentRoutes || typeof documentRoutes !== 'object') {
  errors.push('documentRoutes export is missing');
} else if (Object.keys(documentRoutes).length !== searchEntries.length) {
  errors.push('documentRoutes should include every content document');
}

if (!Array.isArray(rssItems) || rssItems.length !== searchEntries.length) {
  errors.push('rssItems should mirror searchEntries');
} else {
  for (const item of rssItems) {
    for (const field of ['title', 'url', 'description', 'pubDate', 'guid']) {
      if (typeof item[field] !== 'string' || !item[field].trim()) {
        errors.push(`RSS item "${item.guid || 'unknown'}" is missing ${field}`);
      }
    }
  }
}

if (!searchFacets || typeof searchFacets !== 'object') {
  errors.push('searchFacets export is missing');
} else {
  for (const facet of ['collections', 'categories', 'series', 'tags']) {
    if (!Array.isArray(searchFacets[facet]) || searchFacets[facet].length === 0) {
      errors.push(`searchFacets.${facet} should contain filter values`);
    }
  }
}

if (!Array.isArray(searchIndexDocuments) || searchIndexDocuments.length !== searchEntries.length) {
  errors.push('searchIndexDocuments should mirror searchEntries');
} else {
  for (const document of searchIndexDocuments) {
    for (const field of ['id', 'url', 'title', 'excerpt', 'collection', 'category', 'series', 'content']) {
      if (typeof document[field] !== 'string' || !document[field].trim()) {
        errors.push(`search index document "${document.id || 'unknown'}" is missing ${field}`);
      }
    }
    if (!Array.isArray(document.tags) || document.tags.length === 0) {
      errors.push(`search index document "${document.id || 'unknown'}" should include tags`);
    }
    if (!document.url.startsWith('/documents/')) {
      errors.push(`search index document "${document.id}" should point to its document route`);
    }
    if (nonPublishedIds.has(document.id)) {
      errors.push(`non-published entry "${document.id}" leaked into searchIndexDocuments`);
    }
  }
}

if (!pagefindIndexConfig || typeof pagefindIndexConfig !== 'object') {
  errors.push('pagefindIndexConfig export is missing');
} else {
  for (const filter of ['collection', 'category', 'series', 'tag']) {
    if (!pagefindIndexConfig.filters?.includes(filter)) {
      errors.push(`pagefindIndexConfig should declare ${filter} filter`);
    }
  }
}

if (errors.length) {
  for (const error of errors) console.error(`ERROR ${error}`);
  process.exit(1);
}

console.log(`Content check passed: ${searchEntries.length} searchable entries.`);
