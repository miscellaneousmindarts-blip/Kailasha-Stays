-- =============================================================================
-- Per-channel pricing
--
-- The booking card now quotes two totals side by side — what a guest pays
-- booking direct, and what the same stay costs on Airbnb — so the direct
-- saving is visible before they choose. That needs a price per night per
-- channel, not one flat nightly rate.
--
-- Airbnb has no public API for reading a host's own nightly rates (the iCal
-- feed carries availability only, never prices), so the Airbnb figure is
-- entered by the admin rather than fetched. Leaving it blank simply hides
-- the Airbnb total instead of showing a wrong one.
--
-- Resolution order for any given night:
--   1. a rate_periods row covering that night  → direct_price / airbnb_price
--   2. otherwise the property's base_price / airbnb_base_price
--   3. otherwise unpriced — the UI asks the guest to enquire
-- =============================================================================

-- Property-level default for the Airbnb column. base_price already exists and
-- keeps its meaning: the default direct nightly rate.
alter table public.properties
  add column if not exists airbnb_base_price numeric check (airbnb_base_price >= 0);

comment on column public.properties.base_price is
  'Default direct nightly rate, before any rate_periods override.';
comment on column public.properties.airbnb_base_price is
  'Default Airbnb nightly rate, for comparison against the direct price. Manually maintained — Airbnb exposes no rate API.';

-- -----------------------------------------------------------------------------
-- Date-range overrides (weekends, festivals, off season)
-- -----------------------------------------------------------------------------

create table if not exists public.rate_periods (
  id            uuid primary key default gen_random_uuid(),
  property_id   uuid not null references public.properties(id) on delete cascade,
  label         text,
  -- half-open [start_date, end_date): end_date is the first night NOT covered,
  -- matching the daterange('[)') convention used for bookings.
  start_date    date not null,
  end_date      date not null,
  direct_price  numeric not null check (direct_price >= 0),
  airbnb_price  numeric check (airbnb_price >= 0),
  created_at    timestamptz not null default now(),
  constraint rate_periods_dates_valid check (end_date > start_date)
);

create index if not exists rate_periods_property_dates_idx
  on public.rate_periods (property_id, start_date, end_date);

-- One price per night per property: overlapping periods would make the nightly
-- rate ambiguous, so the database refuses them outright (surfaces as 23P01,
-- the same code the booking overlap guard uses).
create extension if not exists btree_gist with schema extensions;

alter table public.rate_periods
  drop constraint if exists rate_periods_no_overlap;
alter table public.rate_periods
  add constraint rate_periods_no_overlap
  exclude using gist (
    property_id with =,
    daterange(start_date, end_date, '[)') with &&
  );

-- -----------------------------------------------------------------------------
-- RLS — readable wherever the property itself is public, writable by admins
-- -----------------------------------------------------------------------------

alter table public.rate_periods enable row level security;

drop policy if exists rate_periods_public_read on public.rate_periods;
create policy rate_periods_public_read on public.rate_periods
  for select to anon, authenticated using (
    exists (select 1 from public.properties p
            where p.id = property_id and p.status = 'published')
  );

drop policy if exists rate_periods_admin_all on public.rate_periods;
create policy rate_periods_admin_all on public.rate_periods
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
