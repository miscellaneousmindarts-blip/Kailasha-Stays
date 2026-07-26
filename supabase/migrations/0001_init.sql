-- =============================================================================
-- BnB website — initial schema (PLAN.md §2)
-- Run this whole file once in the Supabase SQL editor.
-- =============================================================================

create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists btree_gist; -- uuid + daterange exclusion constraint

-- -----------------------------------------------------------------------------
-- 0. helpers
-- -----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 1. admins
-- -----------------------------------------------------------------------------

create table if not exists public.admin_users (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text,
  created_at timestamptz not null default now()
);

-- SECURITY DEFINER so admin RLS policies can read admin_users without
-- recursing into admin_users' own RLS.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 2. properties
-- -----------------------------------------------------------------------------

create table if not exists public.properties (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title          text not null check (char_length(title) between 1 and 160),
  status         text not null default 'draft' check (status in ('draft','published','archived')),
  summary        text check (char_length(summary) <= 400),
  description    text,
  property_type  text default 'Apartment',
  max_guests     int  default 2  check (max_guests  between 1 and 50),
  bedrooms       int  default 1  check (bedrooms    between 0 and 20),
  beds           int  default 1  check (beds        between 0 and 40),
  bathrooms      numeric default 1 check (bathrooms between 0 and 20),
  base_price     numeric check (base_price >= 0),
  currency       text not null default 'INR',
  amenities      text[] not null default '{}',
  house_rules    text,
  check_in_time  text default '13:00',
  check_out_time text default '11:00',
  address_line   text,
  area           text,
  city           text default 'Vrindavan',
  state          text default 'Uttar Pradesh',
  lat            numeric check (lat between -90 and 90),
  lng            numeric check (lng between -180 and 180),
  gmaps_url      text,
  airbnb_url     text,
  booking_com_url text,
  sort_order     int not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists properties_status_sort_idx on public.properties (status, sort_order);

drop trigger if exists properties_set_updated_at on public.properties;
create trigger properties_set_updated_at before update on public.properties
  for each row execute function public.set_updated_at();

-- private per-property info: guest portal + admin only, never public
create table if not exists public.property_private (
  property_id     uuid primary key references public.properties(id) on delete cascade,
  exact_address   text,
  exact_gmaps_url text,
  directions_note text,
  wifi_name       text,
  wifi_password   text,
  door_code       text,
  other_notes     text
);

create table if not exists public.property_contacts (
  id            uuid primary key default gen_random_uuid(),
  property_id   uuid not null references public.properties(id) on delete cascade,
  name          text not null,
  role          text,
  phone         text not null,
  show_to_guest boolean not null default true,
  sort_order    int not null default 0
);

create index if not exists property_contacts_property_idx on public.property_contacts (property_id, sort_order);

create table if not exists public.property_images (
  id           uuid primary key default gen_random_uuid(),
  property_id  uuid not null references public.properties(id) on delete cascade,
  storage_path text not null,
  alt          text,
  is_cover     boolean not null default false,
  sort_order   int not null default 0
);

create index if not exists property_images_property_idx on public.property_images (property_id, sort_order);
-- at most one cover photo per property
create unique index if not exists property_images_one_cover_idx
  on public.property_images (property_id) where is_cover;

-- -----------------------------------------------------------------------------
-- 3. flexible content sections (admin page builder)
--    `type` is deliberately NOT constrained here: new block types are added in
--    app code (lib/blocks.ts) and need no migration.
-- -----------------------------------------------------------------------------

create table if not exists public.property_sections (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  title       text check (char_length(title) <= 160),
  type        text not null check (char_length(type) between 1 and 40),
  content     jsonb not null default '{}'::jsonb,
  audience    text not null default 'public' check (audience in ('public','guest','both')),
  visible     boolean not null default true,
  sort_order  int not null default 0
);

create index if not exists property_sections_property_idx
  on public.property_sections (property_id, sort_order);

-- -----------------------------------------------------------------------------
-- 4. add-on services
-- -----------------------------------------------------------------------------

create table if not exists public.addon_services (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete cascade, -- null = all properties
  name        text not null check (char_length(name) between 1 and 120),
  description text,
  price       numeric check (price >= 0),
  price_unit  text default 'per booking',
  active      boolean not null default true,
  sort_order  int not null default 0
);

create index if not exists addon_services_property_idx on public.addon_services (property_id, sort_order);

-- -----------------------------------------------------------------------------
-- 5. enquiries
-- -----------------------------------------------------------------------------

create table if not exists public.enquiries (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete restrict,
  name        text not null check (char_length(name) between 1 and 120),
  phone       text not null check (char_length(phone) between 6 and 20),
  check_in    date not null,
  check_out   date not null,
  guests      int not null default 2 check (guests between 1 and 50),
  addon_ids   uuid[] not null default '{}',
  message     text check (char_length(message) <= 1000),
  status      text not null default 'new' check (status in ('new','contacted','converted','closed')),
  created_at  timestamptz not null default now(),
  constraint enquiries_dates_valid check (check_out > check_in)
);

create index if not exists enquiries_status_created_idx on public.enquiries (status, created_at desc);
create index if not exists enquiries_property_idx on public.enquiries (property_id);

-- -----------------------------------------------------------------------------
-- 6. bookings
-- -----------------------------------------------------------------------------

create table if not exists public.bookings (
  id               uuid primary key default gen_random_uuid(),
  property_id      uuid not null references public.properties(id) on delete restrict,
  enquiry_id       uuid references public.enquiries(id) on delete set null,
  source           text not null default 'direct'
                     check (source in ('direct','airbnb','booking_com','other','blocked')),
  guest_name       text,
  phone            text,
  guests           int check (guests between 1 and 50),
  check_in         date not null,
  check_out        date not null,
  status           text not null default 'confirmed' check (status in ('confirmed','cancelled','completed')),
  total_amount     numeric not null default 0 check (total_amount >= 0),
  currency         text not null default 'INR',
  portal_token     text unique check (portal_token is null or char_length(portal_token) between 8 and 64),
  token_expires_at timestamptz,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint bookings_dates_valid check (check_out > check_in)
);

create index if not exists bookings_property_dates_idx on public.bookings (property_id, check_in, check_out);
create index if not exists bookings_status_checkin_idx on public.bookings (status, check_in);

-- hard guarantee against double-booking the same property
alter table public.bookings drop constraint if exists bookings_no_overlap;
alter table public.bookings add constraint bookings_no_overlap
  exclude using gist (
    property_id with =,
    daterange(check_in, check_out, '[)') with &&
  ) where (status in ('confirmed','completed'));

drop trigger if exists bookings_set_updated_at on public.bookings;
create trigger bookings_set_updated_at before update on public.bookings
  for each row execute function public.set_updated_at();

create table if not exists public.booking_addons (
  id               uuid primary key default gen_random_uuid(),
  booking_id       uuid not null references public.bookings(id) on delete cascade,
  addon_service_id uuid references public.addon_services(id) on delete set null,
  name             text not null,
  price            numeric not null default 0 check (price >= 0),
  qty              int not null default 1 check (qty between 1 and 99),
  status           text not null default 'requested' check (status in ('requested','confirmed','cancelled')),
  created_at       timestamptz not null default now()
);

create index if not exists booking_addons_booking_idx on public.booking_addons (booking_id);

create table if not exists public.payments (
  id         uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  amount     numeric not null check (amount > 0),
  method     text,
  note       text,
  paid_at    date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists payments_booking_idx on public.payments (booking_id);

create table if not exists public.guest_documents (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references public.bookings(id) on delete cascade,
  guest_name  text,
  doc_type    text not null default 'govt_id',
  storage_path text not null,
  uploaded_at timestamptz not null default now()
);

create index if not exists guest_documents_booking_idx on public.guest_documents (booking_id);

-- -----------------------------------------------------------------------------
-- 7. calendar sync
-- -----------------------------------------------------------------------------

create table if not exists public.calendar_sources (
  id             uuid primary key default gen_random_uuid(),
  property_id    uuid not null references public.properties(id) on delete cascade,
  platform       text not null check (platform in ('airbnb','booking_com','other')),
  ical_url       text not null,
  last_synced_at timestamptz,
  last_status    text,
  last_error     text,
  created_at     timestamptz not null default now()
);

create index if not exists calendar_sources_property_idx on public.calendar_sources (property_id);

create table if not exists public.external_events (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  source_id   uuid not null references public.calendar_sources(id) on delete cascade,
  uid         text not null,
  start_date  date not null,
  end_date    date not null,
  summary     text,
  synced_at   timestamptz not null default now(),
  unique (source_id, uid),
  constraint external_events_dates_valid check (end_date > start_date)
);

create index if not exists external_events_property_dates_idx
  on public.external_events (property_id, start_date, end_date);

-- =============================================================================
-- 8. Row Level Security
-- =============================================================================

alter table public.admin_users       enable row level security;
alter table public.properties        enable row level security;
alter table public.property_private  enable row level security;
alter table public.property_contacts enable row level security;
alter table public.property_images   enable row level security;
alter table public.property_sections enable row level security;
alter table public.addon_services    enable row level security;
alter table public.enquiries         enable row level security;
alter table public.bookings          enable row level security;
alter table public.booking_addons    enable row level security;
alter table public.payments          enable row level security;
alter table public.guest_documents   enable row level security;
alter table public.calendar_sources  enable row level security;
alter table public.external_events   enable row level security;

-- admin_users: a signed-in admin may read their own row; nothing else.
drop policy if exists admin_users_self_read on public.admin_users;
create policy admin_users_self_read on public.admin_users
  for select to authenticated using (user_id = auth.uid());

-- properties: public reads published rows; admins do everything.
drop policy if exists properties_public_read on public.properties;
create policy properties_public_read on public.properties
  for select to anon, authenticated using (status = 'published');

drop policy if exists properties_admin_all on public.properties;
create policy properties_admin_all on public.properties
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- property_images / sections: public reads only for published properties
drop policy if exists property_images_public_read on public.property_images;
create policy property_images_public_read on public.property_images
  for select to anon, authenticated using (
    exists (select 1 from public.properties p
            where p.id = property_id and p.status = 'published')
  );

drop policy if exists property_images_admin_all on public.property_images;
create policy property_images_admin_all on public.property_images
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists property_sections_public_read on public.property_sections;
create policy property_sections_public_read on public.property_sections
  for select to anon, authenticated using (
    visible
    and audience in ('public','both')
    and exists (select 1 from public.properties p
                where p.id = property_id and p.status = 'published')
  );

drop policy if exists property_sections_admin_all on public.property_sections;
create policy property_sections_admin_all on public.property_sections
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- addon_services: public reads active ones (needed by the booking form)
drop policy if exists addon_services_public_read on public.addon_services;
create policy addon_services_public_read on public.addon_services
  for select to anon, authenticated using (
    active and (
      property_id is null
      or exists (select 1 from public.properties p
                 where p.id = property_id and p.status = 'published')
    )
  );

drop policy if exists addon_services_admin_all on public.addon_services;
create policy addon_services_admin_all on public.addon_services
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Everything below is admin-only. The public site and the guest portal reach
-- this data exclusively through the SECURITY DEFINER functions in §9.
do $$
declare t text;
begin
  foreach t in array array[
    'property_private','property_contacts','enquiries','bookings',
    'booking_addons','payments','guest_documents','calendar_sources','external_events'
  ] loop
    execute format('drop policy if exists %I_admin_all on public.%I', t, t);
    execute format(
      'create policy %I_admin_all on public.%I for all to authenticated
         using (public.is_admin()) with check (public.is_admin())', t, t);
  end loop;
end $$;

-- =============================================================================
-- 9. RPCs
-- =============================================================================

-- 9.1 Availability for the public date picker.
-- Returns date ranges only — no guest data, no source, nothing identifying.
create or replace function public.get_unavailable_dates(p_property_id uuid)
returns table (start_date date, end_date date)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select b.check_in, b.check_out
    from public.bookings b
    join public.properties p on p.id = b.property_id
   where b.property_id = p_property_id
     and b.status in ('confirmed','completed')
     and b.check_out >= current_date
     and p.status = 'published'
  union all
  select e.start_date, e.end_date
    from public.external_events e
    join public.properties p on p.id = e.property_id
   where e.property_id = p_property_id
     and e.end_date >= current_date
     and p.status = 'published';
$$;

revoke execute on function public.get_unavailable_dates(uuid) from public;
grant execute on function public.get_unavailable_dates(uuid) to anon, authenticated;

-- 9.2 Is a range free? Used by the public form and the admin booking form.
create or replace function public.check_availability(
  p_property_id uuid, p_check_in date, p_check_out date
) returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p_check_out > p_check_in
     and not exists (
       select 1 from public.bookings b
        where b.property_id = p_property_id
          and b.status in ('confirmed','completed')
          and daterange(b.check_in, b.check_out, '[)')
              && daterange(p_check_in, p_check_out, '[)')
     )
     and not exists (
       select 1 from public.external_events e
        where e.property_id = p_property_id
          and daterange(e.start_date, e.end_date, '[)')
              && daterange(p_check_in, p_check_out, '[)')
     );
$$;

revoke execute on function public.check_availability(uuid, date, date) from public;
grant execute on function public.check_availability(uuid, date, date) to anon, authenticated;

-- 9.3 Create an enquiry (the only public write path).
-- Validates the property is published and the dates are sane, clamps input
-- lengths, and returns just the new id — the caller can never read the table.
create or replace function public.create_enquiry(
  p_property_id uuid,
  p_name        text,
  p_phone       text,
  p_check_in    date,
  p_check_out   date,
  p_guests      int  default 2,
  p_addon_ids   uuid[] default '{}',
  p_message     text default null
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_recent int;
begin
  if not exists (
    select 1 from public.properties
     where id = p_property_id and status = 'published'
  ) then
    raise exception 'Property not available' using errcode = '22023';
  end if;

  if p_check_out <= p_check_in then
    raise exception 'Check-out must be after check-in' using errcode = '22023';
  end if;

  if p_check_in < current_date - 1 then
    raise exception 'Check-in cannot be in the past' using errcode = '22023';
  end if;

  if coalesce(btrim(p_name), '') = '' or coalesce(btrim(p_phone), '') = '' then
    raise exception 'Name and phone are required' using errcode = '22023';
  end if;

  -- light spam guard: max 5 enquiries per phone per hour
  select count(*) into v_recent
    from public.enquiries
   where phone = btrim(p_phone)
     and created_at > now() - interval '1 hour';

  if v_recent >= 5 then
    raise exception 'Too many enquiries, please contact us on WhatsApp' using errcode = '22023';
  end if;

  insert into public.enquiries (
    property_id, name, phone, check_in, check_out, guests, addon_ids, message
  ) values (
    p_property_id,
    left(btrim(p_name), 120),
    left(btrim(p_phone), 20),
    p_check_in,
    p_check_out,
    greatest(1, least(coalesce(p_guests, 2), 50)),
    coalesce(p_addon_ids, '{}'),
    left(nullif(btrim(coalesce(p_message, '')), ''), 1000)
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.create_enquiry(uuid, text, text, date, date, int, uuid[], text) from public;
grant execute on function public.create_enquiry(uuid, text, text, date, date, int, uuid[], text) to anon, authenticated;

-- 9.4 Guest portal bundle — everything /stay/[token] needs, in one call.
-- Returns null for unknown, cancelled or expired tokens. Never returns file
-- paths for guest documents.
create or replace function public.get_booking_by_token(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_booking public.bookings;
  v_result  jsonb;
begin
  if p_token is null or char_length(p_token) < 8 then
    return null;
  end if;

  select * into v_booking
    from public.bookings
   where portal_token = p_token
     and status <> 'cancelled'
     and (token_expires_at is null or token_expires_at > now());

  if not found then
    return null;
  end if;

  select jsonb_build_object(
    'booking', jsonb_build_object(
      'id', v_booking.id,
      'guest_name', v_booking.guest_name,
      'phone', v_booking.phone,
      'guests', v_booking.guests,
      'check_in', v_booking.check_in,
      'check_out', v_booking.check_out,
      'nights', (v_booking.check_out - v_booking.check_in),
      'status', v_booking.status,
      'currency', v_booking.currency
    ),
    'property', (
      select jsonb_build_object(
        'id', p.id,
        'title', p.title,
        'area', p.area,
        'city', p.city,
        'check_in_time', p.check_in_time,
        'check_out_time', p.check_out_time,
        'house_rules', p.house_rules,
        'max_guests', p.max_guests,
        'images', coalesce((
          select jsonb_agg(jsonb_build_object('storage_path', i.storage_path, 'alt', i.alt)
                           order by i.is_cover desc, i.sort_order)
            from public.property_images i where i.property_id = p.id
        ), '[]'::jsonb)
      ) from public.properties p where p.id = v_booking.property_id
    ),
    'private', (
      select jsonb_build_object(
        'exact_address', pp.exact_address,
        'exact_gmaps_url', pp.exact_gmaps_url,
        'directions_note', pp.directions_note,
        'wifi_name', pp.wifi_name,
        'wifi_password', pp.wifi_password,
        'door_code', pp.door_code,
        'other_notes', pp.other_notes
      ) from public.property_private pp where pp.property_id = v_booking.property_id
    ),
    'contacts', coalesce((
      select jsonb_agg(jsonb_build_object('name', c.name, 'role', c.role, 'phone', c.phone)
                       order by c.sort_order)
        from public.property_contacts c
       where c.property_id = v_booking.property_id and c.show_to_guest
    ), '[]'::jsonb),
    'sections', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', s.id, 'title', s.title, 'type', s.type, 'content', s.content)
                       order by s.sort_order)
        from public.property_sections s
       where s.property_id = v_booking.property_id
         and s.visible and s.audience in ('guest','both')
    ), '[]'::jsonb),
    'addons_available', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', a.id, 'name', a.name, 'description', a.description,
               'price', a.price, 'price_unit', a.price_unit)
                       order by a.sort_order)
        from public.addon_services a
       where a.active
         and (a.property_id is null or a.property_id = v_booking.property_id)
    ), '[]'::jsonb),
    'addons_booked', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', ba.id, 'name', ba.name, 'price', ba.price,
               'qty', ba.qty, 'status', ba.status)
                       order by ba.created_at)
        from public.booking_addons ba where ba.booking_id = v_booking.id
    ), '[]'::jsonb),
    'billing', (
      select jsonb_build_object(
        'base', v_booking.total_amount,
        'addons_total', coalesce((
          select sum(ba.price * ba.qty) from public.booking_addons ba
           where ba.booking_id = v_booking.id and ba.status = 'confirmed'), 0),
        'total', v_booking.total_amount + coalesce((
          select sum(ba.price * ba.qty) from public.booking_addons ba
           where ba.booking_id = v_booking.id and ba.status = 'confirmed'), 0),
        'paid', coalesce((
          select sum(pm.amount) from public.payments pm
           where pm.booking_id = v_booking.id), 0),
        'due', v_booking.total_amount
               + coalesce((select sum(ba.price * ba.qty) from public.booking_addons ba
                            where ba.booking_id = v_booking.id and ba.status = 'confirmed'), 0)
               - coalesce((select sum(pm.amount) from public.payments pm
                            where pm.booking_id = v_booking.id), 0),
        'payments', coalesce((
          select jsonb_agg(jsonb_build_object(
                   'amount', pm.amount, 'method', pm.method, 'paid_at', pm.paid_at)
                           order by pm.paid_at)
            from public.payments pm where pm.booking_id = v_booking.id), '[]'::jsonb)
      )
    ),
    'documents', coalesce((
      select jsonb_agg(jsonb_build_object(
               'guest_name', gd.guest_name, 'doc_type', gd.doc_type,
               'uploaded_at', gd.uploaded_at)
                       order by gd.uploaded_at)
        from public.guest_documents gd where gd.booking_id = v_booking.id
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke execute on function public.get_booking_by_token(text) from public;
grant execute on function public.get_booking_by_token(text) to anon, authenticated;

-- 9.5 Guest requests an add-on from the portal.
create or replace function public.request_addon(
  p_token text, p_addon_id uuid, p_qty int default 1
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_booking public.bookings;
  v_addon   public.addon_services;
  v_count   int;
  v_id      uuid;
begin
  select * into v_booking
    from public.bookings
   where portal_token = p_token
     and status = 'confirmed'
     and (token_expires_at is null or token_expires_at > now());

  if not found then
    raise exception 'Invalid or expired link' using errcode = '22023';
  end if;

  select * into v_addon
    from public.addon_services
   where id = p_addon_id
     and active
     and (property_id is null or property_id = v_booking.property_id);

  if not found then
    raise exception 'Service not available' using errcode = '22023';
  end if;

  -- guard against a guest spamming requests
  select count(*) into v_count
    from public.booking_addons
   where booking_id = v_booking.id and status = 'requested';

  if v_count >= 20 then
    raise exception 'Too many pending requests' using errcode = '22023';
  end if;

  insert into public.booking_addons (booking_id, addon_service_id, name, price, qty, status)
  values (
    v_booking.id, v_addon.id, v_addon.name, coalesce(v_addon.price, 0),
    greatest(1, least(coalesce(p_qty, 1), 99)), 'requested'
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.request_addon(text, uuid, int) from public;
grant execute on function public.request_addon(text, uuid, int) to anon, authenticated;

-- =============================================================================
-- 10. Storage buckets
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'property-images', 'property-images', true, 10485760,
  array['image/jpeg','image/png','image/webp','image/avif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'guest-docs', 'guest-docs', false, 5242880,
  array['image/jpeg','image/png','application/pdf']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- property-images: world-readable, admin-writable
drop policy if exists property_images_public_read on storage.objects;
create policy property_images_public_read on storage.objects
  for select to anon, authenticated using (bucket_id = 'property-images');

drop policy if exists property_images_admin_write on storage.objects;
create policy property_images_admin_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'property-images' and public.is_admin());

drop policy if exists property_images_admin_update on storage.objects;
create policy property_images_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'property-images' and public.is_admin());

drop policy if exists property_images_admin_delete on storage.objects;
create policy property_images_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'property-images' and public.is_admin());

-- guest-docs: no anon access at all. Admins read; writes happen only through
-- the service-role guest-upload function.
drop policy if exists guest_docs_admin_read on storage.objects;
create policy guest_docs_admin_read on storage.objects
  for select to authenticated
  using (bucket_id = 'guest-docs' and public.is_admin());

drop policy if exists guest_docs_admin_write on storage.objects;
create policy guest_docs_admin_write on storage.objects
  for all to authenticated
  using (bucket_id = 'guest-docs' and public.is_admin())
  with check (bucket_id = 'guest-docs' and public.is_admin());
