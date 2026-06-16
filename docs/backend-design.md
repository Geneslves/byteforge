# ByteForge Backend Design

ByteForge uses Cloudflare Pages Functions plus Cloudflare D1. The production
runbook, API surface, security model, and deployment steps live in
`docs/backend-production.md`.

Key implementation files:

- `functions/api/`: Pages Functions endpoints.
- `functions/lib/http.js`: response, CORS, and public error helpers.
- `functions/lib/auth.js`: PBKDF2 password hashing, JWT signing, and auth.
- `schema/d1.sql`: SQLite/D1 schema and indexes.
- `wrangler.toml`: non-secret Cloudflare runtime configuration.

The backend intentionally stays on Cloudflare-native primitives until the site
needs a separate service boundary.
