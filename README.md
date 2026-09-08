# JOB KHOJ — Production Fix Pack

This build removes the old browser-only data architecture and fixes the 31-item audit.

## Database setup
1. Create a Supabase project.
2. Enable Email/Password authentication.
3. Run `supabase/schema.sql` in Supabase SQL Editor.
4. Create the first Supabase Auth user. The first successful login automatically claims the owner role when `admin_users` is empty.
5. Set these frontend environment variables in Cloudflare Pages/Vite:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` (or legacy `VITE_SUPABASE_ANON_KEY`)
6. Build with `npm ci` then `npm run build`.

## Data architecture
Jobs, exams, results, admit cards, blog posts, ad slots, settings, and analytics are stored in Supabase. Browser localStorage is only a read-only offline cache; failed writes never fall back to localStorage.

## Admin security
Supabase Auth + RLS is the security boundary. Roles are owner/editor/viewer. Content mutations require owner/editor; configuration and staff management require owner. The first authenticated account can claim owner only when no staff account exists.

## CSV
Use the Admin CSV template. Supported columns:
`title, organization, category, post, job_type, location, vacancy, qualification, age_limit, application_fee, start_date, last_date, exam_date, selection_process, salary, apply_url, notification_url, official_url, status, featured`

Rows are CSV-quoted correctly, validated for width/date/URL/order, duplicates are detected using title + organization, and slugs are made unique.

## SEO / routing
Public pages use clean paths (`/jobs`, `/job/<slug>`, `/exams`, `/results`, `/admit-cards`, `/blog`, `/article/<slug>`). Cloudflare Pages rewrites all paths to `index.html` via `public/_redirects`. The admin sitemap generator includes all public sections plus published jobs and articles.

## Push notifications
The legacy third-party service worker/ad script has been removed. The included service worker is first-party and intentionally minimal. Push delivery must only be enabled after a first-party Web Push/VAPID backend is configured; the UI no longer pretends that a checkbox alone sends notifications.

## Verification
A TypeScript source check passes for the production entrypoint (`main.ts`, `data.ts`, Supabase client, icons). A full Vite build requires a normal network-enabled `npm ci`; this working environment cannot fetch missing npm tarballs offline.

### Optional Web Push setup
Set `VITE_VAPID_PUBLIC_KEY` for the browser and configure `VAPID_SUBJECT`, `VAPID_PUBLIC_KEY`, and `VAPID_PRIVATE_KEY` as Supabase Edge Function secrets. Deploy `supabase/functions/send-push`. The public popup's **ENABLE ALERTS** button creates a subscription; the edge function sends notifications and removes expired subscriptions.

## Cloudflare deployment

### Cloudflare Pages
1. Connect this repository to Cloudflare Pages.
2. Build command: `npm run build`
3. Build output directory: `dist`
4. Add `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_VAPID_PUBLIC_KEY` as Pages environment variables.
5. Add `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SITE_URL` as non-Vite Pages Function variables where applicable.
6. The `/sitemap.xml` URL is served by `functions/sitemap.ts`; add a Pages redirect from `/sitemap.xml` to `/sitemap` if your Pages routing setup requires it.

### Cloudflare scheduled expiry Worker
The separate `workers/expire-jobs` Worker runs every 30 minutes. Deploy it with:

```bash
npx wrangler deploy -c wrangler.expire-jobs.toml
npx wrangler secret put SUPABASE_URL -c wrangler.expire-jobs.toml
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY -c wrangler.expire-jobs.toml
```

The service-role key must never be placed in `VITE_*` variables or client code.

## Production checklist
1. Create the Supabase schema by running `supabase/schema.sql`.
2. Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in Cloudflare.
3. Create the first Supabase Auth user and claim first owner from the admin login.
4. For push notifications, configure VAPID environment variables and deploy `supabase/functions/send-push`.
5. Run `npm ci` and `npm run build` before deployment.
6. Do not put service-role keys in Vite environment variables or client code.


## Production owner setup
Create the first Supabase Auth user, then run: `insert into public.admin_users(user_id, role) values ('YOUR_AUTH_USER_UUID','owner');` The app never auto-promotes the first visitor/user.

## Deployment checklist
1. Create the first Supabase Auth user and provision exactly one `owner` row in `public.admin_users`.
2. Run `supabase/schema.sql` in Supabase SQL Editor.
3. Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (or legacy anon key).
4. For push, configure `VITE_VAPID_PUBLIC_KEY`, `VAPID_SUBJECT`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `PUBLIC_SITE_ORIGIN`, and `SUPABASE_SERVICE_ROLE_KEY` for the push Edge Function/Cloudflare environment as appropriate.
5. Deploy with `npm ci && npm run build`.
6. Confirm `/sitemap.xml`, `/robots.txt`, `/manifest.webmanifest`, `/sw.js`, and `/admin` work after deployment.

## Production verification

The project has separate TypeScript configurations for browser source (`tsconfig.app.json`) and Vite config (`tsconfig.node.json`). Run `npm ci` followed by `npm run verify` in CI/deployment. `npm run verify` performs application type-checking, Vite-config type-checking, and the real Vite production build.

The source package has been syntax/configuration checked in the build environment. A full Vite production bundle could not be executed in this environment because external npm registry DNS/network access is unavailable; no claim of a completed Vite bundle is made here.

## Production build verification

Run the same checks used by CI before deploying:

```bash
npm ci
npm run verify
```

GitHub Actions also runs `npm ci`, the application and Vite-config type checks, and `npm run build` on pushes and pull requests to `main`/`master`.
