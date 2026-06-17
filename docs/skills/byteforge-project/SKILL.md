---
name: byteforge-project
description: Work on the ByteForge repository in E:\Code\byteforge. Use when Codex needs to inspect, modify, debug, verify, document, or plan this project, especially for Vite static routing, content data, Pagefind/search, Cloudflare Pages Functions, D1 auth, rate limiting, admin dashboards, docs cleanup, and project-specific verification commands.
---

# ByteForge Project

## Start Here

Treat the live repository as the source of truth. Read current files before changing behavior, and preserve unrelated user changes in the dirty worktree.

Use these references as needed:

- `references/project-map.md` for structure, ownership, and canonical docs.
- `references/backend-auth.md` for Cloudflare Pages Functions, D1, auth, refresh tokens, and rate limiting.
- `references/verification.md` for the verification ladder and local Pages dev checks.
- `references/development-plan.md` for the recommended next phases.

## Default Workflow

1. Check `git status --short --ignored` before edits.
2. For route/content work, inspect `src/data/index.js`, `src/data/routes.js`, `src/data/content-model.js`, and related collection files.
3. For backend work, inspect `functions/_middleware.js`, `functions/api/`, `functions/lib/`, `schema/d1.sql`, and `wrangler.toml`.
4. Add or update a guard script when fixing a regression.
5. Run focused checks first, then the broader ByteForge verification ladder.
6. Keep docs synchronized when changing routes, API contracts, schema, commands, or workflow semantics.

## Project Rules

- Do not revert user changes in the dirty worktree.
- Keep generated/temporary root clutter out of the repository root. Put backend/auth historical notes under `docs/auth/`.
- Keep logs, temporary files, local Wrangler cache, and generated backup output under `runtime/`.
- Keep `README.md` and `ROADMAP.md` as root-level entry docs.
- Use `schema/d1.sql` as the baseline D1 schema; migrations should not be the only place a required table exists.
- Use `functions/_middleware.js` for global Pages middleware. Do not use `functions/api/__middleware.js`, and avoid relying on `functions/api/_middleware.js` for critical cross-route behavior.
- `/api/health` is intentionally not rate-limited. Use `/api/auth/me` or another real API route to verify rate limiting.

## Verification Shortcuts

Use direct Node checks when `pnpm` is blocked by local sandbox permissions:

```powershell
node scripts/check-project.js
node scripts/check-auth.js
node scripts/check-backend.js
node scripts/check-routes.js
node scripts/check-static.js
node scripts/check-head.js
node scripts/check-content.js
node scripts/check-source.js
```

Use the full project checks when available:

```powershell
pnpm run check:project
pnpm build
pnpm run check:routes
pnpm run check:auth
pnpm run check:backend
pnpm run api:test:local
```

For endpoint behavior, start Pages locally with:

```powershell
pnpm run db:reset:local
pnpm run dev:local
```

Stop the Wrangler/Node processes you start before finishing.
