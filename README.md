# Split v2

Shared expense tracker built with React, Vite, Capacitor and Supabase. The v1 baseline remains in Git commit `fb1567f`; v2 work is isolated on branch `v2-supabase`.

## Supabase setup

1. Create a Supabase project.
2. Run `supabase/migrations/20260826090000_split_v2.sql` in the SQL editor (or with the Supabase CLI).
3. Copy `.env.example` to `.env`.
4. Fill in the project URL and the **public** anon/publishable key.

Never place a `service_role` key in a `VITE_*` variable: Vite embeds these values in the browser bundle.

```bash
cp .env.example .env
npm install
npm run dev
```

## v1 data

Split v2 never deletes or mutates the `split-data-v1` localStorage record. After sign-in, the home screen offers an explicit import that creates an idempotent cloud copy. Imported groups preserve participants, expenses and settlements; the originals remain available locally.

## Security model

- Authentication is handled by Supabase Auth.
- Account access (`group_users`) is separate from expense participants (`members`), so a group can include people without accounts.
- Row Level Security is enabled on every application table.
- Group data is readable only by group users.
- Group metadata is editable only by the owner.
- Expenses are editable by their creator or the group owner.
- Expense writes use a transactional RPC that validates payer and participant membership.

## Quality checks

```bash
npm run lint
npm test
npm run build
```

## Android

Requires Android Studio / Android SDK and JDK 21.

```bash
npm run build
npx cap sync android
npx cap open android
```
