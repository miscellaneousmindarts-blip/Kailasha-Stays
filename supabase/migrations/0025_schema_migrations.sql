-- =============================================================================
-- Record which migrations have actually been applied
--
-- Until now nothing tracked this. Migrations are hand-run in the Supabase SQL
-- editor, so "has 0022 run?" was answerable only from memory — and on
-- 2026-08-12 that failed in production: two different files both numbered
-- 0022 (0022_block_only_images and what is now 0024_booking_calendar_block_flag),
-- one was run, the other was assumed run, and booking creation broke with
-- "Could not find the 'blocks_calendar' column of 'bookings'". The duplicate
-- number is fixed by the rename; this table fixes the part that let it go
-- unnoticed.
--
-- Paired with scripts/migration-status.mjs, which diffs the files on disk
-- against the rows here and names anything pending. `npm run migrations:status`
-- answers the question that previously had to be remembered.
--
-- CONVENTION for every new migration from here on — one line, at the end:
--     insert into public.schema_migrations (version) values ('0026_whatever')
--       on conflict (version) do nothing;
--
-- Safe to re-run.
-- =============================================================================

create table if not exists public.schema_migrations (
  version     text primary key,
  applied_at  timestamptz not null default now()
);

comment on table public.schema_migrations is
  'One row per applied migration file, named without the .sql suffix. Written '
  'by the migration itself as its last statement. Compare against the files on '
  'disk with `npm run migrations:status`.';

-- Backfill. Every one of these was verified applied against this database by
-- probing a column or table it introduced, not assumed from the file existing.
insert into public.schema_migrations (version) values
  ('0001_init'),
  ('0002_calendar_sync_cron'),
  ('0003_pricing'),
  ('0004_addon_catalog'),
  ('0005_photo_tags'),
  ('0006_stay_defaults'),
  ('0007_homepage_sections'),
  ('0008_homepage_builder_v2'),
  ('0009_homepage_homes_hideable'),
  ('0010_video_media'),
  ('0011_tenants'),
  ('0012_tenant_scoping'),
  ('0013_public_read_anon_only'),
  ('0014_site_settings_per_tenant'),
  ('0015_branding'),
  ('0016_guest_portal_branding'),
  ('0017_impersonation_log'),
  ('0018_room_service_menu'),
  ('0019_canonical_host'),
  ('0020_move_primary_tenant_to_subdomain'),
  ('0021_booking_channels'),
  ('0022_block_only_images'),
  ('0023_booking_pricing_breakdown'),
  ('0024_booking_calendar_block_flag')
on conflict (version) do nothing;

-- RLS: readable by nobody through the API. The status script uses the service
-- role key, which bypasses RLS; leaving the table exposed to anon would
-- publish the project's migration history to the internet for no benefit.
alter table public.schema_migrations enable row level security;

insert into public.schema_migrations (version) values ('0025_schema_migrations')
  on conflict (version) do nothing;
