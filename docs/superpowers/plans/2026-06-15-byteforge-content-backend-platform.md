# ByteForge Content Backend Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn ByteForge from a static visual shell with generated document pages into a maintainable content platform with split data modules, generated SEO artifacts, Pagefind-ready indexing, and an optional serverless backend path.

**Architecture:** Keep the current Vite static site as the public rendering layer. Move content ownership into smaller data modules, generate documents/search/RSS/sitemap at build time, then add a thin serverless backend only for mutable concerns such as drafts, feedback, private admin sync, analytics events, and future content ingestion.

**Tech Stack:** Vite 6, Vanilla JavaScript modules, Node build scripts, static HTML artifacts, Pagefind-ready document pages, RSS XML, optional Cloudflare Pages Functions/Workers with D1/KV/R2 for backend services.

---

## Current Completion Audit

- Completed: Stage 0 current baseline is committed at `411d6c9 feat: add content document pages`.
- Completed: `pnpm run check` runs `check:project`, `check:content`, `build`, `check:routes`, `check:static`, `check:source`, and `check:visual`.
- Completed: `pnpm run audit` reports no known vulnerabilities.
- Completed: browser-level visual regression exists in `scripts/check-visual.js` and covers `/`, `/logs/`, `/deployments/`, `/archive/`, `/documents/performance-optimization-complete/`, `/search/`, filtered `/search/`, and `/academic/`.
- Completed: search and archive were upgraded with `searchFacets`, `searchIndexDocuments`, `pagefindIndexConfig`, and `archiveIndex`.
- Completed: content entries were entityized into `contentDocuments`, `documentRoutes`, and `rssItems`, with `/documents/<id>/` static detail pages.
- Partial: content data is still concentrated in `src/data/content.js`; it should be split before content volume grows.
- Partial: `rss.xml` is generated, but feed validation and richer item metadata are not yet checked.
- Partial: sitemap is still `public/sitemap.xml`, not generated from `routeData` and `contentDocuments`.
- Partial: static head is route-specific, but JSON-LD and schema-specific validation are not implemented.
- Not started: real Pagefind package execution and generated `/pagefind/` bundle.
- Not started: backend service layer, database schema, admin workflow, draft workflow, or content ingestion API.

## Target File Structure

```text
src/data/
  collections/
    logs.js
    deployments.js
    archive.js
    dev-ai.js
    snippets.js
    academic.js
  content-model.js
  routes.js
  planets.js
  index.js

scripts/
  build.js
  generate-sitemap.js
  generate-rss.js
  check-content.js
  check-routes.js
  check-static.js
  check-head.js
  check-visual.js

functions/
  api/
    health.js
    feedback.js
    content-events.js

schema/
  d1.sql
```

## Task 1: Split Content Data Without Behavior Changes

**Files:**
- Create: `src/data/collections/logs.js`
- Create: `src/data/collections/deployments.js`
- Create: `src/data/collections/archive.js`
- Create: `src/data/collections/dev-ai.js`
- Create: `src/data/collections/snippets.js`
- Create: `src/data/collections/academic.js`
- Create: `src/data/content-model.js`
- Create: `src/data/routes.js`
- Create: `src/data/planets.js`
- Create: `src/data/index.js`
- Modify: `src/main.js`
- Modify: `scripts/build.js`
- Modify: `scripts/check-content.js`
- Modify: `scripts/check-routes.js`
- Modify: `scripts/check-static.js`

- [ ] Step 1: Write a failing structure guard.

Add checks to `scripts/check-project.js` requiring these files:

```js
const requiredFiles = [
  'src/data/index.js',
  'src/data/content-model.js',
  'src/data/routes.js',
  'src/data/planets.js',
  'src/data/collections/logs.js',
  'src/data/collections/deployments.js',
  'src/data/collections/archive.js',
  'src/data/collections/dev-ai.js',
  'src/data/collections/snippets.js',
  'src/data/collections/academic.js',
];
```

Run:

```powershell
pnpm run check:project
```

Expected: FAIL until the files are created.

- [ ] Step 2: Move raw collection arrays.

Each collection file should export one array:

```js
export const logEntries = [
  {
    id: 'performance-optimization-complete',
    meta: '2026-06-09',
    title: '性能优化完成',
    text: '完成构建配置优化、移动端适配和渲染性能提升。',
    href: '/logs/#performance-optimization-complete',
    tags: ['performance', 'vite', 'optimization'],
  },
];
```

Keep the existing ids stable. Do not change URLs during this task.

- [ ] Step 3: Move derived model logic into `src/data/content-model.js`.

This file owns `contentCollections`, `collectionMetadata`, `searchEntries`, `contentDocuments`, `documentRoutes`, `rssItems`, `searchFacets`, `pagefindIndexConfig`, `searchIndexDocuments`, and `archiveIndex`.

```js
import { logEntries } from './collections/logs.js';

export const contentCollections = {
  logs: logEntries,
};
```

- [ ] Step 4: Move route definitions into `src/data/routes.js`.

`routes.js` should import only derived data it needs:

```js
import { archiveIndex, contentCollections, searchEntries, searchFacets } from './content-model.js';

export const routeDefinitions = [
  {
    path: '/logs',
    collection: 'logs',
    kicker: '>_ ~/logs',
    title: 'Field Logs',
    summary: '工程、研究、部署和知识归档的连续记录。',
    description: '按时间整理站点演进、工程修复、视觉基线和内容系统建设记录。',
  },
];
```

- [ ] Step 5: Move planet config into `src/data/planets.js`.

```js
export const planetRoutes = {
  Logs: { route: '/logs', state: 'ready', collection: 'logs' },
  Search: { route: '/search', state: 'ready', collection: 'search' },
};
```

- [ ] Step 6: Make `src/data/index.js` the only public data import surface.

```js
export * from './content-model.js';
export * from './routes.js';
export * from './planets.js';
```

- [ ] Step 7: Update imports.

Replace imports from `../src/data/content.js` or `./data/content.js` with `../src/data/index.js` or `./data/index.js`.

- [ ] Step 8: Run verification.

```powershell
pnpm run check
pnpm run audit
pnpm run clean
```

Expected: all pass, worktree has only tracked source changes.

- [ ] Step 9: Commit.

```powershell
git add src/data scripts src/main.js package.json README.md docs/implementation-plan.md
git commit -m "refactor: split content data modules"
```

## Task 2: Generate Sitemap and Strengthen Static Head

**Files:**
- Create: `scripts/generate-sitemap.js`
- Create: `scripts/check-head.js`
- Modify: `scripts/build.js`
- Modify: `scripts/check-routes.js`
- Modify: `package.json`
- Modify: `README.md`

- [ ] Step 1: Write `scripts/generate-sitemap.js`.

```js
import { writeFile } from 'node:fs/promises';
import { contentDocuments, routeData } from '../src/data/index.js';

const urls = [
  '/',
  ...Object.keys(routeData).filter((path) => path !== '/').map((path) => `${path}/`),
  ...contentDocuments.map((document) => document.url),
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url><loc>https://byteforge.dev${url}</loc></url>`).join('\n')}
</urlset>
`;

await writeFile('dist/sitemap.xml', xml);
```

- [ ] Step 2: Call sitemap generation from `scripts/build.js`.

After static route and document generation, import and run a helper or inline the same `urls` logic so `dist/sitemap.xml` is produced.

- [ ] Step 3: Keep `public/sitemap.xml` only if needed for fallback.

The canonical sitemap should be generated into `dist/sitemap.xml` during build.

- [ ] Step 4: Add `scripts/check-head.js`.

The check should assert every route and document artifact contains:

```js
[
  '<title>',
  '<meta name="description"',
  '<link rel="canonical"',
  '<meta property="og:title"',
  '<meta property="og:description"',
  '<meta property="og:url"',
  '<meta name="twitter:title"',
  '<meta name="twitter:description"',
  '<meta name="twitter:url"',
]
```

- [ ] Step 5: Add JSON-LD generation in `scripts/build.js`.

Inject this for document pages:

```js
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": document.title,
  "description": document.summary,
  "datePublished": document.publishedAt,
  "url": `https://byteforge.dev${document.url}`,
  "keywords": document.tags
}
```

- [ ] Step 6: Wire scripts.

In `package.json`:

```json
"check:head": "node scripts/check-head.js",
"check": "pnpm run check:project && pnpm run check:content && pnpm build && pnpm run check:routes && pnpm run check:static && pnpm run check:head && pnpm run check:source && pnpm run check:visual"
```

- [ ] Step 7: Run verification and commit.

```powershell
pnpm run check
pnpm run clean
git add scripts package.json README.md docs/implementation-plan.md
git commit -m "feat: generate sitemap and structured metadata"
```

## Task 3: Integrate Real Pagefind Build Output

**Files:**
- Modify: `package.json`
- Modify: `scripts/build.js`
- Modify: `scripts/check-static.js`
- Modify: `scripts/check-visual.js`
- Modify: `src/modules/routing.js`
- Modify: `README.md`

- [ ] Step 1: Add Pagefind dependency.

```powershell
pnpm add -D pagefind
```

- [ ] Step 2: Add script.

```json
"build:pagefind": "pagefind --site dist --output-subdir pagefind"
```

- [ ] Step 3: Run Pagefind after Vite/static generation.

Either call the Pagefind CLI from `pnpm run check` after `pnpm build`, or spawn it in `scripts/build.js` after HTML artifacts exist.

- [ ] Step 4: Update static checks.

`scripts/check-static.js` should require:

```js
requireFile(join(distDir, 'pagefind', 'pagefind.js'));
requireFile(join(distDir, 'pagefind', 'pagefind-ui.css'));
```

- [ ] Step 5: Add progressive search adapter.

In `src/modules/routing.js`, keep local search as fallback. Only load Pagefind when `window.location.pathname === '/search/'` and `/pagefind/pagefind.js` exists.

- [ ] Step 6: Verify.

```powershell
pnpm run check
pnpm run audit
pnpm run clean
```

- [ ] Step 7: Commit.

```powershell
git add package.json pnpm-lock.yaml scripts src README.md docs/implementation-plan.md
git commit -m "feat: add pagefind indexing pipeline"
```

## Task 4: Backend Foundation With Serverless Functions

**Files:**
- Create: `functions/api/health.js`
- Create: `functions/api/feedback.js`
- Create: `functions/api/content-events.js`
- Create: `schema/d1.sql`
- Create: `docs/backend-design.md`
- Modify: `README.md`

**Backend recommendation:** Use Cloudflare Pages Functions or Workers as the first backend target because the public site remains static, backend endpoints can live beside the frontend, and D1/KV/R2 cover the likely near-term needs without a long-running server.

- [ ] Step 1: Add health endpoint.

`functions/api/health.js`:

```js
export async function onRequestGet() {
  return Response.json({
    ok: true,
    service: 'byteforge-api',
    version: '1',
  });
}
```

- [ ] Step 2: Add D1 schema.

`schema/d1.sql`:

```sql
CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  document_id TEXT,
  route_path TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS content_events (
  id TEXT PRIMARY KEY,
  document_id TEXT,
  route_path TEXT NOT NULL,
  event_type TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

- [ ] Step 3: Add feedback endpoint.

`functions/api/feedback.js`:

```js
const json = (body, init = {}) => Response.json(body, {
  headers: { 'cache-control': 'no-store' },
  ...init,
});

export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.routePath !== 'string' || typeof body.message !== 'string') {
    return json({ ok: false, error: 'invalid_payload' }, { status: 400 });
  }

  const message = body.message.trim();
  if (message.length < 2 || message.length > 1000) {
    return json({ ok: false, error: 'invalid_message_length' }, { status: 400 });
  }

  const id = crypto.randomUUID();
  await env.DB.prepare(
    'INSERT INTO feedback (id, document_id, route_path, message, created_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(id, body.documentId || null, body.routePath, message, new Date().toISOString()).run();

  return json({ ok: true, id });
}
```

- [ ] Step 4: Add read-only event endpoint.

`functions/api/content-events.js`:

```js
export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.routePath !== 'string' || typeof body.eventType !== 'string') {
    return Response.json({ ok: false, error: 'invalid_payload' }, { status: 400 });
  }

  const id = crypto.randomUUID();
  await env.DB.prepare(
    'INSERT INTO content_events (id, document_id, route_path, event_type, created_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(id, body.documentId || null, body.routePath, body.eventType, new Date().toISOString()).run();

  return Response.json({ ok: true, id }, { headers: { 'cache-control': 'no-store' } });
}
```

- [ ] Step 5: Document deployment bindings.

`docs/backend-design.md` should define:

```text
Binding name: DB
Database: byteforge
Tables: feedback, content_events
Runtime: Cloudflare Pages Functions or Workers
Public endpoints:
  GET  /api/health
  POST /api/feedback
  POST /api/content-events
```

- [ ] Step 6: Add backend checks.

Add `scripts/check-backend.js` that verifies:

```js
[
  'functions/api/health.js',
  'functions/api/feedback.js',
  'functions/api/content-events.js',
  'schema/d1.sql',
  'docs/backend-design.md',
]
```

- [ ] Step 7: Wire `check:backend`.

```json
"check:backend": "node scripts/check-backend.js"
```

Add it to `pnpm run check` after `check:source`.

- [ ] Step 8: Verify and commit.

```powershell
pnpm run check
pnpm run audit
pnpm run clean
git add functions schema docs scripts package.json README.md
git commit -m "feat: add serverless backend foundation"
```

## Task 5: Admin and Draft Workflow Design

**Files:**
- Create: `docs/content-workflow.md`
- Create: `scripts/check-content-workflow.js`
- Modify: `package.json`

- [ ] Step 1: Define content states.

`docs/content-workflow.md`:

```text
Content states:
- draft: local-only, not included in search index or RSS
- preview: built in local preview, excluded from RSS
- published: included in document routes, search index, sitemap, and RSS
- archived: visible by direct URL, excluded from RSS
```

- [ ] Step 2: Add fields to every content entry.

Each entry should have:

```js
status: 'published',
type: 'log',
```

- [ ] Step 3: Update content checks.

`scripts/check-content.js` should fail unless every entry has `status` and `type`, and unless RSS only includes `status === 'published'`.

- [ ] Step 4: Verify and commit.

```powershell
pnpm run check
pnpm run clean
git add src/data scripts docs package.json
git commit -m "feat: add content publishing workflow"
```

## Execution Order

1. Task 1: split content modules.
2. Task 2: generated sitemap and structured metadata.
3. Task 3: Pagefind pipeline.
4. Task 5: content states and draft workflow.
5. Task 4: backend foundation.

Backend should come after the static content model is cleaner. The first backend implementation should stay thin: health, feedback, and content events. Do not move public rendering or content reads to a database until the static publishing flow becomes a real bottleneck.

## Verification Baseline

Run this before every commit:

```powershell
pnpm run check
pnpm run audit
pnpm run clean
git status --short --ignored
```

Expected:

```text
check passes
audit has no known vulnerabilities
dist is removed by clean
only node_modules and local dev logs remain ignored
```
