# ByteForge Backend Production Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the Cloudflare Pages Functions backend from a draft integration into a production-ready baseline without adding temporary external services.

**Architecture:** Keep Cloudflare Pages Functions and D1 as the backend boundary. Centralize HTTP response/CORS/error behavior in `functions/lib/http.js`, centralize auth in `functions/lib/auth.js`, and enforce the backend contract through scripts.

**Tech Stack:** Cloudflare Pages Functions, Cloudflare D1, Web Crypto PBKDF2/HMAC, Wrangler, Vite build output.

---

### Task 1: Backend Guardrails

**Files:**
- Modify: `scripts/check-backend.js`
- Create: `scripts/check-auth.js`
- Modify: `package.json`
- Modify: `scripts/check-project.js`

- [x] Add checks for D1-compatible indexes, env-based JWT secrets, PBKDF2 password hashing, non-wildcard CORS, safe API errors, admin auth, observability, and production docs.
- [x] Add a runtime auth check that verifies PBKDF2 hashes, valid JWTs, wrong-secret rejection, and missing-secret rejection.
- [x] Wire `check:auth` into the project scripts.

### Task 2: Schema And Runtime Config

**Files:**
- Modify: `schema/d1.sql`
- Modify: `wrangler.toml`

- [x] Replace inline `INDEX` table declarations with standalone `CREATE INDEX IF NOT EXISTS` statements.
- [x] Add constraints for roles, active flags, and content event types.
- [x] Add `SITE_ORIGIN`, `ALLOWED_ORIGINS`, and Cloudflare observability settings.
- [x] Keep `JWT_SECRET` out of tracked config.

### Task 3: Shared Backend Libraries

**Files:**
- Create: `functions/lib/http.js`
- Modify: `functions/lib/auth.js`

- [x] Add shared JSON response, CORS allowlist, safe error, and DB-binding helpers.
- [x] Replace hardcoded JWT secret with `env.JWT_SECRET`.
- [x] Replace bare SHA-256 password hashing with salted PBKDF2-SHA256.
- [x] Keep auth helpers dependency-light and compatible with Pages Functions.

### Task 4: API Endpoint Cleanup

**Files:**
- Modify: `functions/api/*.js`
- Modify: `functions/api/auth/*.js`
- Modify: `functions/api/admin/**/*.js`
- Modify: `public/admin.js`
- Modify: `public/admin-v2.js`

- [x] Apply shared HTTP helpers to all API endpoints.
- [x] Require admin authorization for all `/api/admin/*` endpoints.
- [x] Stop returning raw `error.message` to clients.
- [x] Update admin frontends to attach bearer tokens to admin API calls.

### Task 5: Production Documentation

**Files:**
- Create: `docs/backend-production.md`
- Create: `docs/cloudflare/deployment.md`
- Create: `docs/cloudflare/auth.md`
- Modify: `docs/backend-design.md`
- Delete: old root-level Cloudflare credential notes

- [x] Write the backend production runbook.
- [x] Move Cloudflare deployment/auth docs under `docs/cloudflare/`.
- [x] Remove real token values and unsafe token examples from tracked docs.
- [x] Link production guidance to official Cloudflare documentation.

### Verification

- [x] `node scripts/check-auth.js`
- [x] `node scripts/check-backend.js`
- [x] `pnpm run check:project`
- [x] `pnpm build`
- [x] `node scripts/check-routes.js`
- [x] `node scripts/check-static.js`
- [x] `node scripts/check-head.js`
- [x] `node scripts/check-content.js`
- [x] `node scripts/check-source.js`
- [ ] `pnpm run check` blocked by sandbox `EPERM: lstat 'C:\Users\Kong'`; direct child checks above were run instead.
- [ ] `node scripts/check-visual.js` timed out in the local Chrome environment.
