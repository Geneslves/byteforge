# Cloudflare Authentication And Secrets

## Local Wrangler Login

Use OAuth for local operator access:

```powershell
pnpm exec wrangler login
pnpm exec wrangler whoami
```

This stores Wrangler credentials locally. It is the preferred option for
interactive development.

## CI Token

For CI, create a scoped Cloudflare API token in the Cloudflare dashboard and
store it in the CI secret manager as `CLOUDFLARE_API_TOKEN`.

Required capabilities for this project:

| Scope | Permission |
| --- | --- |
| Account - D1 | Edit |
| Account - Pages | Edit |
| Account - Workers Scripts | Edit |
| User - User Details | Read |

Never commit the token, print it in logs, or paste it into Markdown.

## Application Secret

The backend signs JWTs with `JWT_SECRET`. It must be present in every runtime
environment.

Set it in Cloudflare:

```powershell
pnpm exec wrangler secret put JWT_SECRET
```

Set it locally in `.dev.vars`:

```text
JWT_SECRET=replace-with-a-long-random-local-secret
```

Recommended secret generation:

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

## Rotation

JWT secret rotation invalidates existing sessions. Planned rotation steps:

1. Schedule a maintenance window for admin users.
2. Set a new `JWT_SECRET` with `wrangler secret put JWT_SECRET`.
3. Redeploy Pages.
4. Ask users to sign in again.

For zero-downtime rotation later, add `JWT_SECRET_PREVIOUS` support before
rotating.
