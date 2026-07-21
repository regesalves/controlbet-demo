# Testing Architecture

This project follows a hybrid testing model:

- Integration and E2E tests should use the real Supabase development environment.
- Local Dev Tools are the source of truth for seeding, resetting, and cleaning test data.
- The Supabase mock stays limited to unit tests that need isolated business-rule coverage.
- The application runtime must keep using the real Supabase client path.

## Recommended split

### Unit tests

- Use `src/test-support/mockSupabase.js` when a test needs deterministic auth, storage, or RPC behavior.
- Prefer this only for isolated logic, not for validating app flows end to end.

### Integration tests

- Run against the Supabase dev environment.
- Seed data with the existing Dev Tools or dedicated helpers in `src/dev/devDatabase.js`.
- Keep the database as close as possible to the real schema and RLS behavior.

### E2E tests

- Drive the app through the browser against the real Supabase-backed development stack.
- Use Dev Tools to prepare and clean the dataset before and after scenarios.

## Boundary rule

- Do not wire the application to a parallel Supabase client in production or development runtime.
- If a test needs the mock, the test should opt into it explicitly.
