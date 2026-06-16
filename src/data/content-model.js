import { logEntries } from './collections/logs.js';
import { deploymentEntries } from './collections/deployments.js';
import { archiveEntries } from './collections/archive.js';
import { devAiEntries } from './collections/dev-ai.js';
import { snippetsEntries } from './collections/snippets.js';
import { academicEntries } from './collections/academic.js';

export const contentCollections = {
  logs: logEntries,
  deployments: deploymentEntries,
  archive: archiveEntries,
  'dev-ai': devAiEntries,
  snippets: snippetsEntries,
  academic: academicEntries,
};

export const collectionMetadata = {
  logs: { label: 'Logs', category: 'Engineering', series: 'Build Journal' },
  deployments: { label: 'Deployments', category: 'Projects', series: 'Release Notes' },
  archive: { label: 'Archive', category: 'Knowledge', series: 'Knowledge Archive' },
  'dev-ai': { label: 'Dev & AI', category: 'Workflow', series: 'AI Development' },
  snippets: { label: 'Snippets', category: 'Patterns', series: 'Engineering Snippets' },
  academic: { label: 'Academic', category: 'Research', series: 'Academic Notes' },
};

const buildSearchableText = (entry, metadata, collection) => [
  entry.meta,
  entry.title,
  entry.text,
  metadata.label,
  metadata.category,
  metadata.series,
  collection,
  ...(entry.tags || []),
].join(' ').toLowerCase();

const toDocumentUrl = (id) => `/documents/${id}/`;
const toDocumentPath = (id) => `/documents/${id}`;

const withCollection = (collection, entries) =>
  entries.map((entry) => ({
    ...entry,
    sourceHref: entry.href,
    href: toDocumentUrl(entry.id),
    collection,
    category: entry.category || collectionMetadata[collection].category,
    series: entry.series || collectionMetadata[collection].series,
    searchableText: buildSearchableText(entry, collectionMetadata[collection], collection),
  }));

export const allContentEntries = [
  ...withCollection('logs', logEntries),
  ...withCollection('deployments', deploymentEntries),
  ...withCollection('archive', archiveEntries),
  ...withCollection('dev-ai', devAiEntries),
  ...withCollection('snippets', snippetsEntries),
  ...withCollection('academic', academicEntries),
];

export const publicContentEntries = allContentEntries.filter((entry) => entry.status === 'published');

export const searchEntries = publicContentEntries;

const getPublishedAt = (entry) => entry.meta.match(/\d{4}-\d{2}-\d{2}/)?.[0] || '2026-06-09';

const buildDocumentBody = (entry) => [
  entry.text,
  `This document belongs to the ${entry.collection} collection, ${entry.category} category, and ${entry.series} series.`,
  `Tags: ${(entry.tags || []).join(', ')}.`,
  'Pagefind source: this entity page is the stable document target for future static full-text indexing.',
  'RSS source: this entity page is also the canonical item URL for feed generation.',
].join('\n\n');

export const contentDocuments = searchEntries.map((entry) => ({
  id: entry.id,
  status: entry.status,
  type: entry.type,
  path: toDocumentPath(entry.id),
  url: toDocumentUrl(entry.id),
  sourceHref: entry.sourceHref,
  title: entry.title,
  summary: entry.text,
  body: buildDocumentBody(entry),
  collection: entry.collection,
  category: entry.category,
  series: entry.series,
  tags: entry.tags,
  publishedAt: getPublishedAt(entry),
  searchableText: entry.searchableText,
}));

export const documentRoutes = Object.fromEntries(contentDocuments.map((document) => [document.path, document]));

export const rssItems = contentDocuments.map((document) => ({
  title: document.title,
  url: `https://byteforge.dev${document.url}`,
  description: document.summary,
  pubDate: new Date(`${document.publishedAt}T00:00:00Z`).toUTCString(),
  guid: `byteforge:${document.id}`,
}));

const uniqueSorted = (values) => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
const toFacetOptions = (values) => uniqueSorted(values).map((value) => ({ id: value, label: value }));

export const searchFacets = {
  collections: [
    { id: 'all', label: 'All collections' },
    ...Object.entries(collectionMetadata).map(([id, metadata]) => ({ id, label: metadata.label })),
  ],
  categories: toFacetOptions(searchEntries.map((entry) => entry.category)),
  series: toFacetOptions(searchEntries.map((entry) => entry.series)),
  tags: toFacetOptions(searchEntries.flatMap((entry) => entry.tags || [])),
};

export const pagefindIndexConfig = {
  version: 1,
  rootSelector: '[data-pagefind-body]',
  bundlePath: '/pagefind/pagefind.js',
  filters: ['collection', 'category', 'series', 'tag'],
  sort: { default: 'title' },
};

export const searchIndexDocuments = searchEntries.map((entry) => ({
  id: entry.id,
  status: entry.status,
  type: entry.type,
  url: entry.href,
  title: entry.title,
  excerpt: entry.text,
  collection: entry.collection,
  category: entry.category,
  series: entry.series,
  tags: entry.tags,
  content: entry.searchableText,
  pagefind: {
    url: entry.href,
    meta: {
      title: entry.title,
      collection: entry.collection,
      category: entry.category,
      series: entry.series,
    },
    filters: {
      collection: entry.collection,
      category: entry.category,
      series: entry.series,
      tag: entry.tags,
    },
  },
}));

const groupEntries = (entries, getKey) =>
  Object.entries(entries.reduce((groups, entry) => {
    const key = getKey(entry);
    if (!key) return groups;
    groups[key] = groups[key] || [];
    groups[key].push(entry);
    return groups;
  }, {}))
    .map(([label, items]) => ({ label, count: items.length, items }))
    .sort((a, b) => a.label.localeCompare(b.label));

const getTimelineBucket = (entry) => {
  const year = entry.meta.match(/\d{4}/)?.[0];
  return year || entry.meta;
};

export const archiveIndex = {
  timeline: groupEntries(searchEntries, getTimelineBucket).sort((a, b) => b.label.localeCompare(a.label)),
  categories: groupEntries(searchEntries, (entry) => entry.category),
  series: groupEntries(searchEntries, (entry) => entry.series),
  tags: groupEntries(
    searchEntries.flatMap((entry) => (entry.tags || []).map((tag) => ({ ...entry, archiveTag: tag }))),
    (entry) => entry.archiveTag
  ),
};

export const searchEntriesByCollection = Object.fromEntries(Object.keys(contentCollections).map((collection) => [
  collection,
  searchEntries.filter((entry) => entry.collection === collection),
]));
