# Auth and Backend Notes

This folder collects short-lived setup, migration, and test notes for the ByteForge auth/backend work. Root-level project entry points stay limited to `README.md` and `ROADMAP.md`.

These files are historical notes. Use `docs/backend-production.md` and `docs/skills/byteforge-project/` as the current canonical guidance. In particular, current rate limiting lives in `functions/_middleware.js`; `/api/health` is skipped by design, so rate-limit tests should use an authenticated endpoint such as `/api/auth/me`.

## Files

- `AUTH_INTEGRATION_COMPLETE.md`: auth API and rate-limit integration notes.
- `FRONTEND_INTEGRATION_COMPLETE.md`: auth-facing frontend integration notes.
- `IMPLEMENTATION_COMPLETE.md`: backend implementation summary.
- `MIGRATION_NOW.md`: migration execution notes.
- `HOW_TO_START_DEV.md`: local dev startup notes.
- `FINAL_TEST_GUIDE.md`, `READY_TO_TEST.md`, `TEST_NOW.md`: manual auth-flow testing notes.
- `PROBLEM_SOLVED.md`: short recovery note for the previous auth-flow blocker.
