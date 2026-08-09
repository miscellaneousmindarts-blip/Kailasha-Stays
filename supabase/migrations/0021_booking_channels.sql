-- =============================================================================
-- Booking channels — any number of platforms per listing
--
-- Replaces the two hardcoded channels (properties.airbnb_url +
-- airbnb_base_price, booking_com_url) with a table, so an owner can list on
-- Airbnb, Booking.com, MakeMyTrip, Goibibo, Agoda or anything else and have
-- every one of them show on the booking card with its own price.
--
-- ── Why this is a NEW table and not extra columns on calendar_sources ─────
--
-- calendar_sources would have been the tempting home: it already models "this
-- listing on that platform", already has tenant_id and RLS, and already syncs.
-- But it holds ical_url, and an Airbnb iCal URL is a bearer secret — anyone
-- holding it can read that owner's entire booking calendar. The public
-- booking card has to read channel names, links and prices as `anon`, which
-- would have meant a public-read policy on a table containing those URLs.
--
-- So the split is the same one property_private already makes for addresses
-- and wifi passwords: public-safe fields in a publicly-readable table, secrets
-- in one only admins can read. calendar_sources keeps the iCal URL and gains
-- a channel_id, so the admin UI can still present both as a single "channel"
-- while the database keeps them on opposite sides of that boundary.
--
-- ── On pricing ───────────────────────────────────────────────────────────
--
-- price_mode 'markup' is the primary model, and the live data is why: both
-- priced listings sit at exactly airbnb = direct x 1.172, which is what an
-- OTA commission looks like. A percentage reproduces today's figures exactly
-- AND keeps working when a rate period changes the direct price — which the
-- old fixed airbnb_base_price could not do. 'fixed' stays available for a
-- platform whose price genuinely isn't a function of the direct rate, and
-- 'none' for a channel that should show a link but no price.
--
-- Safe to re-run.
-- =============================================================================

create table if not exists public.booking_channels (
  -- Owning tenant. Set by a trigger from the parent property, like every
  -- other child table (0012).
  tenant_id      uuid not null,
  id             uuid primary key default gen_random_uuid(),
  property_id    uuid not null,
  -- What the guest sees, e.g. "Booking.com". Free text: the whole point is
  -- that the platform list isn't fixed.
  name           text not null check (char_length(trim(name)) between 1 and 60),
  -- Lowercase key for brand styling/known-platform presets. Not unique and
  -- not authoritative — purely a display hint.
  slug           text,
  booking_url    text,
  price_mode     text not null default 'markup'
                   check (price_mode in ('markup', 'fixed', 'none')),
  -- Percent ABOVE the direct nightly rate, e.g. 17.2 renders 3200 as 3750.
  markup_pct     numeric(5,2) check (markup_pct is null or (markup_pct >= 0 and markup_pct <= 500)),
  -- Overrides markup entirely when price_mode = 'fixed'.
  fixed_nightly  numeric(10,2) check (fixed_nightly is null or fixed_nightly >= 0),
  sort_order     int not null default 0,
  active         boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  -- A channel is only worth showing if it goes somewhere or says something.
  constraint booking_channels_has_something check (
    booking_url is not null or price_mode <> 'none'
  ),
  -- Referenced compositely by calendar_sources below, so a calendar source
  -- can never point at a channel in another tenant.
  unique (id, tenant_id)
);

-- (property_id, tenant_id) composite: a channel physically cannot carry a
-- tenant_id different from its property's. Same guarantee as every other
-- child table since 0012.
alter table public.booking_channels
  drop constraint if exists booking_channels_property_fkey;
alter table public.booking_channels
  add constraint booking_channels_property_fkey
  foreign key (property_id, tenant_id)
  references public.properties (id, tenant_id) on delete cascade;

create index if not exists booking_channels_property_idx
  on public.booking_channels (property_id, sort_order);
create index if not exists booking_channels_tenant_idx
  on public.booking_channels (tenant_id);

drop trigger if exists booking_channels_set_tenant on public.booking_channels;
create trigger booking_channels_set_tenant before insert on public.booking_channels
  for each row execute function public.set_tenant_from_property();

drop trigger if exists booking_channels_set_updated_at on public.booking_channels;
create trigger booking_channels_set_updated_at before update on public.booking_channels
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------

alter table public.booking_channels enable row level security;

-- `to anon` only, never `authenticated` — B1's lesson. The public site reads
-- through createPublicClient(), which is cookie-free and always anon; adding
-- `authenticated` here would hand every signed-in admin every tenant's rows,
-- because permissive policies OR together.
drop policy if exists booking_channels_public_read on public.booking_channels;
create policy booking_channels_public_read on public.booking_channels
  for select to anon using (
    active
    and exists (select 1 from public.properties p
                where p.id = property_id and p.status = 'published')
  );

drop policy if exists booking_channels_admin_all on public.booking_channels;
create policy booking_channels_admin_all on public.booking_channels
  for all to authenticated
  using (tenant_id = any(public.current_tenant_ids()))
  with check (tenant_id = any(public.current_tenant_ids()));

-- -----------------------------------------------------------------------------
-- calendar_sources: link each feed to the channel it belongs to
--
-- Nullable, because a calendar source can exist without a guest-facing
-- channel (an owner may sync a platform they don't advertise), and a channel
-- can exist without a feed (a platform with no iCal export).
-- -----------------------------------------------------------------------------

alter table public.calendar_sources
  add column if not exists channel_id uuid;

alter table public.calendar_sources
  drop constraint if exists calendar_sources_channel_fkey;
alter table public.calendar_sources
  add constraint calendar_sources_channel_fkey
  foreign key (channel_id, tenant_id)
  references public.booking_channels (id, tenant_id) on delete set null;

create index if not exists calendar_sources_channel_idx
  on public.calendar_sources (channel_id);

-- -----------------------------------------------------------------------------
-- Backfill: turn the existing hardcoded columns into channel rows
--
-- Guarded on the table being empty so a re-run never duplicates channels.
--
-- The markup is derived per property from its own airbnb_base_price/base_price
-- so every currently-displayed figure stays identical. A property with a link
-- but no price (Garden Studio, today) becomes price_mode 'none' rather than
-- inventing a number for it.
-- -----------------------------------------------------------------------------

do $$
declare
  r record;
  v_channel_id uuid;
  v_mode text;
  v_markup numeric(5,2);
begin
  if exists (select 1 from public.booking_channels) then
    raise notice 'booking_channels is not empty; skipping backfill';
    return;
  end if;

  for r in
    select id, tenant_id, base_price, airbnb_base_price, airbnb_url, booking_com_url
      from public.properties
  loop
    -- Airbnb
    if r.airbnb_url is not null or r.airbnb_base_price is not null then
      if r.airbnb_base_price is not null and r.base_price is not null and r.base_price > 0 then
        v_mode := 'markup';
        v_markup := round(((r.airbnb_base_price / r.base_price) - 1) * 100, 2);
      elsif r.airbnb_base_price is not null then
        v_mode := 'fixed';
        v_markup := null;
      else
        v_mode := 'none';
        v_markup := null;
      end if;

      insert into public.booking_channels
        (tenant_id, property_id, name, slug, booking_url, price_mode, markup_pct,
         fixed_nightly, sort_order)
      values
        (r.tenant_id, r.id, 'Airbnb', 'airbnb', r.airbnb_url, v_mode, v_markup,
         case when v_mode = 'fixed' then r.airbnb_base_price else null end, 0)
      returning id into v_channel_id;

      -- Adopt any existing Airbnb calendar feed for this property.
      update public.calendar_sources
         set channel_id = v_channel_id
       where property_id = r.id and platform = 'airbnb' and channel_id is null;
    end if;

    -- Booking.com — link only today, no price was ever stored for it.
    if r.booking_com_url is not null then
      insert into public.booking_channels
        (tenant_id, property_id, name, slug, booking_url, price_mode, sort_order)
      values
        (r.tenant_id, r.id, 'Booking.com', 'booking_com', r.booking_com_url, 'none', 1)
      returning id into v_channel_id;

      update public.calendar_sources
         set channel_id = v_channel_id
       where property_id = r.id and platform = 'booking_com' and channel_id is null;
    end if;
  end loop;

  raise notice 'Backfilled % booking channel(s)', (select count(*) from public.booking_channels);
end $$;

-- The old columns are deliberately LEFT IN PLACE, unread by the app after
-- this. Dropping them in the same migration that starts using their
-- replacement removes the only way back if the new path misbehaves; they
-- cost nothing and can be dropped once this has run in production for a
-- while:
--
--   alter table public.properties
--     drop column airbnb_url, drop column booking_com_url,
--     drop column airbnb_base_price;
--   alter table public.rate_periods drop column airbnb_price;

comment on table public.booking_channels is
  'Guest-facing booking platforms per listing: name, link and price. Deliberately '
  'separate from calendar_sources, which holds the secret iCal URL and must never '
  'be publicly readable.';
