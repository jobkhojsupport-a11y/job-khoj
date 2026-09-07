# JOB KHOJ

Professional Indian job-alert portal built with Vite + TypeScript + vanilla DOM rendering.

## Setup

1. Install Node.js 18+ (Node.js 20+ recommended).
2. In this folder run:
   `npm install`
3. Copy `.env.example` to `.env.local` and add your Supabase project URL and publishable/anon key.
4. Run:
   `npm run dev`
5. Build for production:
   `npm run build`

## Supabase

The admin login and advertisement database features use Supabase. Set:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` (or legacy `VITE_SUPABASE_ANON_KEY`)

Do not commit `.env.local` or secret keys.

## Deployment

For Netlify or Cloudflare Pages, use `npm run build` and publish the `dist` directory. Add the same Vite environment variables in the hosting dashboard.

## Admin

Open `/#admin` after configuring Supabase Auth and the `admin_users` table. Do not rely on a client-side hard-coded administrator password for production authentication.
