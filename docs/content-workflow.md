# Content Publishing Workflow

## Content States

- `draft`: source-only work in progress. It must not appear in document routes, RSS, search, Pagefind, or sitemap.
- `published`: public content. It appears in document routes, RSS, search, Pagefind, and sitemap.
- `archived`: retained source content. It must not appear in RSS, search, Pagefind, or sitemap unless it is promoted back to `published`.

## Required Fields

Every content entry must have:

- `status`: `draft` | `published` | `archived`
- `type`: `log` | `deployment` | `archive` | `dev-ai` | `snippet` | `academic`

## Filtering Logic

`src/data/content-model.js` exports both source and public views:

- `allContentEntries`: every source entry before visibility filtering.
- `publicContentEntries`: only entries with `status: 'published'`.

Public build outputs must derive from `publicContentEntries`:

- `searchEntries`
- `contentDocuments`
- `rssItems`
- `searchIndexDocuments`
- `archiveIndex`
- `sitemap.xml`

`scripts/check-content.js` guards this contract.

## Search And Discovery

Document detail pages receive static off-screen Pagefind source content during `scripts/build.js`. That source includes:

- `data-pagefind-body`
- `data-pagefind-filter="collection"`
- `data-pagefind-filter="category"`
- `data-pagefind-filter="series"`
- `data-pagefind-filter="tag"`

`scripts/check-head.js` validates JSON-LD and Pagefind filter metadata after build.
