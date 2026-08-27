# Split v2 / PWA status

Updated: 2026-08-27 08:51 GMT+2
Branch: `v2-supabase`
Last implementation commit before this status update: `e9654cbf3fd8a83139ae4253f7ee09a4980ef873`
State: development intentionally stopped and safely saved.

## Ready

- Split v2 Supabase synchronization is complete and was integration-tested against the real project: Auth, group create/join, RLS, expenses, Realtime and cleanup.
- Existing Russian UI, light/dark theme, mobile-first layout and Capacitor Android project remain intact.
- Installable PWA metadata is present: web manifest, standalone mode, theme/background colors, iOS Safari metadata and Apple touch icon.
- App icons are included at 192×192 and 512×512, plus a 512×512 maskable icon.
- The production service worker precaches only same-origin static application-shell files. Supabase API/Auth/Realtime responses are not intercepted or cached.
- Cache names are content-versioned. A newly activated worker removes old Split shell caches and reloads controlled clients after an update.
- Safe-area layout support is included for standalone iPhone use.
- Vite builds work both at `/` and at a configurable static-host subpath through `VITE_BASE_PATH`.
- GitHub Pages deployment workflow is included at `.github/workflows/deploy-pages.yml`.

## Verified before stopping

- Current branch: `v2-supabase`.
- No interrupted merge, rebase, cherry-pick or revert operation was present.
- Repository integrity check (`git fsck --no-dangling`) passed.
- `git diff`, staged diff and `git diff --check` were clean before this status update.
- `npm test -- --run`: 14/14 tests passed.
- `npm run lint`: passed.
- `npm run build`: passed for root hosting.
- `VITE_BASE_PATH=/split/ npm run build`: passed for GitHub Pages-style subpath hosting.
- Generated manifest, service worker and required icons were inspected.
- Local `.env` is ignored by Git. Only the placeholder-only `.env.example` is tracked.
- No passwords, private API keys, credentials or real Supabase project URL are intended for Git.

## Remaining

1. Connect or create the GitHub repository and add it as a Git remote.
2. Authenticate GitHub CLI or otherwise provide authorized repository access.
3. Add GitHub Actions repository secrets `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` using only the public browser key, never `service_role`.
4. Enable **Pages → Source: GitHub Actions** and run the included deployment workflow.
5. Verify the final HTTPS installation/update flow on iPhone Safari and Android Chrome.
6. Add the exact deployed HTTPS URL to Supabase Auth allowed site/redirect URLs.

## Exact next step

Ask the user which GitHub account/organization should own repository `split` and whether it should be public or private. After receiving that answer, authenticate GitHub access, create/connect the repository, add the remote and push branch `v2-supabase`. Do not redo Supabase or PWA implementation unless code or database migrations change.
