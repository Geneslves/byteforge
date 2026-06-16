# Development Plan

## Current State

ByteForge has:

- Static routes for logs, deployments, archive, search, dev-ai, snippets, and academic.
- Generated document detail pages.
- Generated RSS, sitemap, search index, and Pagefind output.
- Cloudflare Pages Functions for health, feedback, content events, auth, refresh token, and admin APIs.
- D1 schema for users, settings, sessions, rate limits, refresh tokens, feedback, and content events.
- Auth test page with registration, login, current-user, refresh-token, auto-refresh, and rate-limit checks.

## Recommended Next Phases

### Phase 1: Stabilize Backend And Admin

- Maintain `pnpm run api:test:local` for register, login, refresh, admin auth, and rate limit.
- Maintain `pnpm run db:reset:local` and `pnpm run db:seed:local` for deterministic local D1 test data.
- Add admin UI checks for inactive users, settings updates, feedback deletion, and analytics empty states.
- Keep public error messages stable and log internal details only server-side.

### Phase 2: Content Workflow

- Keep `status` and `type` fields on all content entries.
- Ensure RSS, search, Pagefind, document routes, and sitemap only include `published` entries.
- Keep `draft` and `archived` as source-only states until a private preview workflow exists.
- Split remaining oversized content/model files if they grow again.

### Phase 3: Search And Discovery

- Keep generated document pages as Pagefind index sources with filter metadata.
- Keep local search as a fallback.
- Add feed validation and richer RSS item metadata.
- Add route and document schema validation for JSON-LD.

### Phase 4: Operations

- Add D1 backup/export runbook validation.
- Add production/staging migration dry-run checks.
- Add a local command that starts Pages dev, applies schema, runs endpoint probes, then stops cleanly.
- Add observability review notes for rate-limit and auth failures.

### Phase 5: Product Expansion

- Build a private draft/admin content workflow before moving public content reads to D1.
- Add content ingestion only after static publishing becomes the bottleneck.
- Consider R2 only when binary/media publishing requirements are real.
