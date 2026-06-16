# Verification Reference

## Focused Checks

Run the narrowest check that proves the current change:

```powershell
node scripts/check-auth.js
node scripts/check-backend.js
node scripts/check-project.js
node scripts/check-routes.js
```

## Full Build Checks

When `pnpm` can run:

```powershell
pnpm run check:project
pnpm build
pnpm run check:routes
pnpm run check:auth
pnpm run check:backend
```

Then add the direct checks that cover built output and source quality:

```powershell
node scripts/check-static.js
node scripts/check-head.js
node scripts/check-content.js
node scripts/check-source.js
```

## Local Pages Dev

Apply baseline schema to local D1:

```powershell
pnpm run db:reset:local
```

Start Pages:

```powershell
pnpm run dev:local
```

Use `http://127.0.0.1:8788` for probes. Stop any Node/Wrangler processes started for verification.

Run the one-command backend integration probe:

```powershell
pnpm run api:test:local
```

It builds the static site, resets local D1, starts Pages dev, verifies register/login/me/refresh/admin settings/rate limit, and writes run logs under `runtime/logs/`.

## Known Local Issues

- `pnpm` may fail in sandbox with `EPERM: lstat 'C:\Users\Kong'`; retry with approved elevation or run direct `node scripts/*` checks.
- Wrangler may print an EPERM while writing logs under `C:\Users\Kong\AppData\Roaming`; if the command reports SQL commands executed successfully, the log-write error is usually sandbox noise.
- Browser access to `127.0.0.1` may be blocked by enterprise policy; use HTTP/API probes instead.
