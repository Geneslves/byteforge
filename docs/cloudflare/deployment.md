# ByteForge Cloudflare Deployment

This document keeps deployment commands production-safe. Do not paste API tokens,
JWT secrets, database IDs for private environments, or other credentials into
tracked files.

## Runtime

- Platform: Cloudflare Pages with Pages Functions.
- Database: Cloudflare D1 bound as `DB`.
- Static output: `dist`.
- Build command: `pnpm build`.
- Functions directory: `functions/`.

## Required Configuration

`wrangler.toml` stores non-secret project settings:

```toml
name = "byteforge"
compatibility_date = "2026-06-15"
pages_build_output_dir = "dist"

[vars]
SITE_ORIGIN = "https://byteforge.dev"
ALLOWED_ORIGINS = "https://byteforge.dev"

[observability]
enabled = true
head_sampling_rate = 1.0

[[d1_databases]]
binding = "DB"
database_name = "byteforge"
database_id = "YOUR_D1_DATABASE_ID_HERE"
```

Production secrets must be configured outside git:

```powershell
pnpm exec wrangler secret put JWT_SECRET
```

For local development, use `.dev.vars`:

```text
JWT_SECRET=replace-with-a-long-random-local-secret
SITE_ORIGIN=http://localhost:8788
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:8788
```

## D1 Setup

Create the database:

```powershell
pnpm exec wrangler d1 create byteforge
```

Copy the returned `database_id` into `wrangler.toml`, then apply the schema:

```powershell
pnpm exec wrangler d1 execute byteforge --file=./schema/d1.sql
```

Verify tables and indexes:

```powershell
pnpm exec wrangler d1 execute byteforge --command "SELECT name, type FROM sqlite_master WHERE type IN ('table', 'index') ORDER BY type, name;"
```

## Local Production-Like Run

Build the static site first so Pages Functions run against the same output shape
as production:

```powershell
pnpm build
pnpm exec wrangler pages dev dist --port 8788
```

Check health:

```powershell
Invoke-RestMethod http://localhost:8788/api/health
```

## Deploy

Deploy manually when needed:

```powershell
pnpm build
pnpm exec wrangler pages deploy dist --project-name byteforge
```

For GitHub integration, configure Cloudflare Pages with:

- Build command: `pnpm build`
- Build output directory: `dist`
- D1 binding: `DB`
- Secret: `JWT_SECRET`
- Environment variables: `SITE_ORIGIN`, `ALLOWED_ORIGINS`

## References

- Cloudflare Pages Functions: https://developers.cloudflare.com/pages/functions/
- D1: https://developers.cloudflare.com/d1/
- Wrangler: https://developers.cloudflare.com/workers/wrangler/
- Secrets: https://developers.cloudflare.com/workers/configuration/secrets/
- Compatibility dates: https://developers.cloudflare.com/workers/configuration/compatibility-dates/
