# ScanIn

Barcode attendance for exam halls. Next.js 15 · Supabase (Postgres + Auth + RLS) · Tailwind.

## Setup
1. Create a Supabase project; run `supabase/migrations/0001_schema_rls.sql` in the SQL editor.
2. Create the first admin in Auth, then insert its row into `public.users` (see bottom of the migration).
3. `cp .env.example .env.local` and fill in the three Supabase values. The service-role key stays server-side.
4. In Supabase Auth: enable email confirmations; add `<SITE_URL>/auth/callback` as a redirect URL.
5. `npm install && npm run dev`

## Testing a production build locally
`ENFORCE_HTTPS=false npm run build && ENFORCE_HTTPS=false npm start` (never set this in production).

## Before go-live
- Replace the `[placeholders]` in the Privacy Policy and Terms, and have counsel review them.
- Run a load test against `/api/scan`; add rate limiting at your CDN/WAF.
- Add a Supabase scheduled job to purge attendance/contact data per your retention period.
