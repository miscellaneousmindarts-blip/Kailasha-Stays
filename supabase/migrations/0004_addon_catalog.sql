-- =============================================================================
-- Add-on catalogue: one common list, per-property selection
--
-- addon_services.property_id previously meant "null = every property, a real
-- id = only that property" — but nothing ever wrote a property-specific row,
-- and there was no admin UI for the catalog at all. This replaces that with
-- what was actually wanted: a single shared catalog (managed in Settings),
-- and an explicit per-property selection of which of those items to offer
-- (managed on each listing). Presence in property_addon_services means
-- "shown on this property" — there's no separate active/inactive-per-property
-- state to keep in sync.
-- =============================================================================

create table if not exists public.property_addon_services (
  property_id      uuid not null references public.properties(id) on delete cascade,
  addon_service_id uuid not null references public.addon_services(id) on delete cascade,
  primary key (property_id, addon_service_id)
);

create index if not exists property_addon_services_addon_idx
  on public.property_addon_services (addon_service_id);

-- Preserve current behavior exactly: every existing addon is today shown on
-- every property (all rows have property_id null), so enable all of them
-- for all properties before the column that used to grant that goes away.
insert into public.property_addon_services (property_id, addon_service_id)
select p.id, a.id
from public.properties p
cross join public.addon_services a
on conflict do nothing;

-- The existing public-read policy's USING clause reads property_id, so it
-- must be dropped (and replaced with the property_id-free version) before
-- the column itself can go — Postgres refuses to drop a column a policy
-- still depends on.
drop policy if exists addon_services_public_read on public.addon_services;
create policy addon_services_public_read on public.addon_services
  for select to anon, authenticated using (active);

alter table public.addon_services drop column if exists property_id;
drop index if exists addon_services_property_idx;

alter table public.property_addon_services enable row level security;

drop policy if exists property_addon_services_public_read on public.property_addon_services;
create policy property_addon_services_public_read on public.property_addon_services
  for select to anon, authenticated using (
    exists (select 1 from public.properties p
            where p.id = property_id and p.status = 'published')
  );

drop policy if exists property_addon_services_admin_all on public.property_addon_services;
create policy property_addon_services_admin_all on public.property_addon_services
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- get_booking_by_token: addons_available now comes through the selection
-- table instead of the property_id is-null-or-mine check.
-- -----------------------------------------------------------------------------

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
        join public.property_addon_services pas
          on pas.addon_service_id = a.id and pas.property_id = v_booking.property_id
       where a.active
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
    ), '[]'::jsonb),
    'settings', (
      select jsonb_build_object(
        'business_name', s.business_name,
        'whatsapp_number', s.whatsapp_number,
        'contact_phone', s.contact_phone,
        'contact_email', s.contact_email,
        'response_note', s.response_note
      ) from public.site_settings s where s.id
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke execute on function public.get_booking_by_token(text) from public;
grant execute on function public.get_booking_by_token(text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- request_addon: the "is this addon available on this booking's property"
-- check now goes through the selection table too.
-- -----------------------------------------------------------------------------

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

  select a.* into v_addon
    from public.addon_services a
    join public.property_addon_services pas
      on pas.addon_service_id = a.id and pas.property_id = v_booking.property_id
   where a.id = p_addon_id
     and a.active;

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
