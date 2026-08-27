# Split v2 / PWA status

Updated: 2026-08-27
Branch: `v2-supabase`
Base Supabase commit: `2d054650392a3df88d067b2c4186350fd52b292e`

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

## Verified

- `npm test -- --run`: 14/14 tests passed.
- `npm run lint`: passed.
- `npm run build`: passed for root hosting.
- `VITE_BASE_PATH=/split/ npm run build`: passed for GitHub Pages-style subpath hosting.
- `dist` contains `manifest.webmanifest`, generated `sw.js`, 192/512/maskable icons and `apple-touch-icon.png`.
- Root and `/split/` asset, manifest and service-worker paths were inspected.
- Workflow YAML parses successfully.
- `git diff --check` is clean.
- `.env` remains ignored and no secret-like file is included in the pending Git changes.

## Remaining for GitHub Pages

1. Create or connect the GitHub repository and push branch `v2-supabase`.
2. Add GitHub Actions repository secrets `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (public browser key only; never use `service_role`).
3. In GitHub repository settings, choose **Pages → Source: GitHub Actions**.
4. Run the `Deploy PWA to GitHub Pages` workflow and verify the final HTTPS URL on iPhone Safari and Android Chrome.
5. Add that exact HTTPS URL to the allowed redirect/site URL configuration in Supabase Auth.

## Continue from here

Start with GitHub repository/remote setup and deployment configuration. Do not redo Supabase implementation or integration tests unless application code or database migrations change.
