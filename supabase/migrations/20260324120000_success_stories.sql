-- Be10x Success Stories — Supabase / Postgres schema
-- Apply with: supabase db push (or run in SQL editor)

create table if not exists public.success_stories (
  id text primary key,
  slug text unique not null,
  name text not null,
  photo_url text,
  email text,
  linkedin_url text,
  domain text,
  domain_category text,
  job_role text,
  achievement_type text,
  achievement_title text,
  quantified_result text,
  story_summary text,
  short_summary text,
  testimonial_quote text,
  youtube_video_url text,
  source_sheet text not null,
  source_row integer not null,
  source_date date,
  audit_status text,
  publication_status text not null default 'draft' check (publication_status in ('draft', 'published')),
  featured boolean not null default false,
  display_order integer,
  email_publish_allowed boolean not null default false,
  updated_at timestamptz not null default now()
);

create index if not exists success_stories_publication_idx on public.success_stories (publication_status);
create index if not exists success_stories_featured_idx on public.success_stories (featured, display_order);

-- Public read: published stories only (no email unless allowed)
create or replace view public.success_stories_public as
select
  id,
  slug,
  name,
  photo_url,
  linkedin_url,
  domain,
  domain_category,
  job_role,
  achievement_type,
  achievement_title,
  quantified_result,
  story_summary,
  short_summary,
  testimonial_quote,
  youtube_video_url,
  source_sheet,
  source_row,
  source_date,
  audit_status,
  publication_status,
  featured,
  display_order,
  updated_at,
  case when email_publish_allowed then email else null end as email
from public.success_stories
where publication_status = 'published';

alter table public.success_stories enable row level security;

create policy "Public read published stories"
  on public.success_stories for select
  using (publication_status = 'published');

create policy "Admins manage stories"
  on public.success_stories for all
  using (auth.jwt() ->> 'role' = 'admin')
  with check (auth.jwt() ->> 'role' = 'admin');

-- Storage bucket for approved learner photos (create in dashboard):
-- success-story-photos (public read, admin write)
