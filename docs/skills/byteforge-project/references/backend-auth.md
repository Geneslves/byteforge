# Backend And Auth Reference

## Runtime Boundary

ByteForge uses Cloudflare Pages static output plus Pages Functions. The backend should remain thin until product requirements justify a larger service boundary.

## API Middleware

Use `functions/_middleware.js` for global Pages middleware. It must:

- Return `next()` for non-API routes.
- Scope behavior to `url.pathname.startsWith('/api/')`.
- Skip `/api/health` and `/api/v1/public/health`.
- Apply `RateLimiter` with `RateLimitPresets.normal`.
- Return 429 with `apiError()` when `RateLimitError.code === 'RATE_LIMIT_EXCEEDED'`.

Do not use `functions/api/__middleware.js`; Pages will not treat it as middleware. Avoid putting critical global behavior only in `functions/api/_middleware.js`.

## Database

`schema/d1.sql` must include every table required by current code:

- `users`
- `settings`
- `sessions`
- `rate_limits`
- `refresh_tokens`
- `feedback`
- `content_events`

If a migration adds a table used by code, update `schema/d1.sql` and `scripts/check-backend.js` in the same change.

Use `schema/seed.sql` for deterministic local seed data. Use `pnpm run db:reset:local` before local backend verification so registration, first-admin behavior, settings, and rate-limit counters start from a known state.

## Auth Contract

- Register and login return `token` and `refreshToken`.
- Access token lifetime: 7 days.
- Refresh token lifetime: 30 days.
- Refresh endpoint: `POST /api/v1/auth/refresh`.
- Password validation requires at least 12 characters.
- First registered user becomes `admin`; later users become `user`.

## Rate Limit Verification

Do not test rate limiting with `/api/health`; it is intentionally skipped.

Use an authenticated endpoint such as `/api/auth/me`:

1. Register or login.
2. Send `Authorization: Bearer <token>`.
3. Use a unique `X-Forwarded-For` value for an isolated test key.
4. Send 105 requests.
5. Expect 100 successful responses and the 101st request to return 429.

If every request succeeds, inspect:

- `functions/_middleware.js` exists and is compiled.
- `.wrangler/pages-dev.err.log` for D1 table errors.
- `schema/d1.sql` includes `rate_limits`.
- Local D1 state was initialized with `--persist-to .wrangler/state`.
