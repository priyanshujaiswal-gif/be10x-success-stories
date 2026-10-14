# be10X Success Stories — engineering handoff

## Repository map

| Path | Description |
|------|-------------|
| `scripts/import_excel.py` | Excel → JSON (private + public) + duplicate report |
| `server/` | Local preview Express API + SQLite persistence |
| `supabase/migrations/` | Production Postgres schema + RLS |
| `src/` | React application (public site + admin UI) |
| `reports/` | Import metadata and duplicate review |
| `data/public-stories.json` | Email-free export for sitemap / reference |

## Replacing local preview with Supabase

1. Apply migration `supabase/migrations/20260324120000_success_stories.sql`.
2. Import rows from `data/private-stories.json` using a one-off script with `SUPABASE_SERVICE_ROLE_KEY` (do not expose service role to the browser).
3. Point the frontend `src/lib/api.ts` to Supabase client queries on `success_stories_public` view for reads.
4. Use Supabase Auth for `/admin` (replace cookie JWT login).
5. Store photos in `success-story-photos` bucket; save public URL in `photo_url`.

## Content workflow

1. Update Excel → `npm run import:data`.
2. Re-seed or upsert into production database.
3. Review `reports/duplicate-report.json` for manual merge decisions (never auto-merge same-name rows).
4. Use admin to feature, reorder, publish/unpublish.

## Default admin (local only)

Configure via `.env` — never commit `.env`. See `.env.example`.
