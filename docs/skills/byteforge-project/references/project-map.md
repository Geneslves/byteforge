# ByteForge Project Map

## Core Stack

- Vite static site with vanilla JavaScript modules.
- Static route generation through `scripts/build.js`.
- Search indexing through local data plus Pagefind build output.
- Cloudflare Pages Functions under `functions/`.
- Cloudflare D1 schema in `schema/d1.sql`.

## Important Paths

- `src/data/index.js`: public data export surface.
- `src/data/content-model.js`: collections, documents, search entries, facets, RSS items, archive index.
- `src/data/routes.js`: `routeDefinitions` and `routeData`.
- `src/data/planets.js`: homepage planet-to-route config.
- `src/modules/routing.js`: browser-side route rendering and document detail rendering.
- `scripts/build.js`: Vite build, static route entries, document entries, RSS, search index, sitemap.
- `scripts/check-*.js`: project guardrails.
- `scripts/api/integration-local.js`: one-command local API integration check.
- `scripts/db/reset-local.js`: reset local D1 state, apply baseline schema, apply seed data.
- `scripts/db/seed-local.js`: apply local D1 seed data only.
- `functions/_middleware.js`: global Pages middleware scoped to `/api/*`.
- `functions/api/`: public, auth, and admin API handlers.
- `functions/lib/auth.js`: PBKDF2 password hashing, JWT creation/verification, auth guard.
- `functions/lib/rate-limit/index.js`: D1-backed rate limiter.
- `functions/lib/http.js`: JSON, CORS, safe API errors.
- `schema/d1.sql`: baseline D1 schema.
- `schema/seed.sql`: deterministic local seed data.
- `runtime/logs/`: local API/Wrangler run logs.
- `runtime/tmp/`: local temporary files and redirected Wrangler config/cache.
- `runtime/backups/`: generated local database backups.
- `docs/backend-production.md`: canonical backend/runbook documentation.
- `docs/auth/`: historical setup and test notes, not canonical.

## Content Route Workflow

For new public content routes:

1. Add or update collection entries in `src/data/collections/`.
2. Let derived content flow through `content-model.js`.
3. Add top-level route config in `src/data/routes.js` if needed.
4. Add or adjust planet binding in `src/data/planets.js` if the homepage needs an entry.
5. Build, then run route, static, head, content, and visual checks.
6. Update docs if the route surface or workflow changed.

## Docs Policy

- Root docs: keep only durable entry points such as `README.md` and `ROADMAP.md`.
- Backend canonical docs: `docs/backend-production.md`.
- Historical auth/backend notes: `docs/auth/`.
- Agentic specs/plans: `docs/superpowers/`.
- Project skills: `docs/skills/`.
- Archived/obsolete notes: `docs/archive/`.
- Runtime output: `runtime/`, with `.gitkeep` files only committed.
