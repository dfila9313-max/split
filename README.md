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

## PWA and GitHub Pages

The production build includes an installable web manifest, iOS home-screen metadata and a versioned service worker. Only the static application shell is precached; Supabase API/Auth/Realtime traffic is never cached by the service worker.

```bash
npm run build
npm run preview
```

For GitHub Pages, add repository secrets `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, then enable **Settings → Pages → Source: GitHub Actions**. The workflow in `.github/workflows/deploy-pages.yml` builds the branch with the repository subpath as Vite's base URL and deploys `dist` over HTTPS.

For another static host mounted at a subpath, set `VITE_BASE_PATH` during the build (it must begin and end with `/`):

```bash
VITE_BASE_PATH=/split/ npm run build
```

Authentication providers that redirect back to the app must allow the final HTTPS site URL in Supabase Auth URL configuration.

## Android

Requires Android Studio / Android SDK and JDK 21.

```bash
npm run build
npx cap sync android
npx cap open android
```
