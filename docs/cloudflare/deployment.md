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
SITE_URL = "https://www.thebyte.tech"
SITE_ORIGIN = "https://www.thebyte.tech"
ALLOWED_ORIGINS = "https://www.thebyte.tech"
REGISTRATION_ENABLED = "false"

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

In non-interactive shells and CI, Wrangler requires an API token:

```powershell
$env:CLOUDFLARE_API_TOKEN = "<token with Pages, D1, and Workers secret access>"
```

Do not write this token to `.env`, `.dev.vars`, `wrangler.toml`, shell history,
or tracked documentation. Use a short-lived shell environment variable, a
secret manager, or GitHub Environment secrets.

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

Before deploying, verify that tracked placeholders are gone from the deployment
configuration:

```powershell
corepack pnpm run check:deploy-config -- --cloudflare infra/env/production.env
```

`infra/env/production.env` can be generated locally with random PostgreSQL and
JWT secrets:

```powershell
corepack pnpm run deploy:env -- production
```

The script does not create the Cloudflare D1 database or its `database_id`;
that value must come from `wrangler d1 create byteforge`.

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
- Environment variables: `SITE_URL`, `SITE_ORIGIN`, `ALLOWED_ORIGINS`,
  `REGISTRATION_ENABLED`

## Canonical Domain Redirect

Use `www.thebyte.tech` as the only canonical production host. In Cloudflare,
open **Rules > Redirect Rules**, create a **Single Redirect**, and configure:

- Rule name: `Apex to canonical www`
- Match expression: `(http.host eq "thebyte.tech")`
- Target URL (dynamic): `concat("https://www.thebyte.tech", http.request.uri.path)`
- Preserve query string: enabled
- Status code: `301`

Keep this rule above application routing rules. Verify it after deployment:

```powershell
curl.exe -I https://thebyte.tech/test-path?source=redirect-check
```

The response must be `301` with
`Location: https://www.thebyte.tech/test-path?source=redirect-check`.

For the self-hosted Caddy deployment, use the tracked
[`infra/Caddyfile`](../../infra/Caddyfile). Its apex host block performs the
same redirect with Caddy's permanent redirect status (`308`).

After the canonical deployment and redirect are live, submit
`https://www.thebyte.tech/sitemap.xml` again in Google Search Console and Bing
Webmaster Tools. This is a dashboard operation and is not performed by the
repository build.

## References

- Cloudflare Pages Functions: https://developers.cloudflare.com/pages/functions/
- D1: https://developers.cloudflare.com/d1/
- Wrangler: https://developers.cloudflare.com/workers/wrangler/
- Secrets: https://developers.cloudflare.com/workers/configuration/secrets/
- Compatibility dates: https://developers.cloudflare.com/workers/configuration/compatibility-dates/
