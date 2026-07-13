# Supabase Setup

This directory contains the versioned backend contract for the dashboard.

## Requirements

- Supabase project linked with the CLI.
- Auth enabled.
- The frontend env vars set in `.env.local`:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

## Apply Migrations

From the project root:

```bash
npx supabase db push
```

For local Supabase development:

```bash
npx supabase start
npx supabase db reset
```

## Dashboard Tables

The migration in `supabase/migrations/20260529_dashboard_schema.sql` creates:

- `public.houses`
- `public.tickets`
- `public.movements`

It adds primary keys, ownership by `user_id`, house ownership checks through composite foreign keys, minimum numeric constraints, useful indexes, and RLS policies for authenticated users.

## RLS Model

Each dashboard table is protected with policies based on:

```sql
auth.uid() = user_id
```

Authenticated users can select, insert, update, and delete only their own rows.

## Existing Remote Projects

If a remote Supabase project already has manually created dashboard tables, inspect existing data before running migrations. The migration is intended as the source of truth for new/reproducible environments; existing manual schemas may need a one-time reconciliation before `db push`.
