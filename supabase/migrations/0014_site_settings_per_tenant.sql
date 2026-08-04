-- =============================================================================
-- site_settings per tenant (phase B2 of docs/saas-multi-tenant-plan.md)
--
-- The last singleton. Its primary key was literally `id boolean default
-- true` — a classic one-row-table trick that cannot express "one row per
-- tenant". This retires that pattern entirely: tenant_id becomes the primary
-- key, exactly like property_private already keys itself on property_id.
--
-- Two things this migration does NOT do, on purpose:
--
--   1. It does not make the public-read policy tenant-aware. RLS cannot know
--      which tenant an anonymous visitor's request is "for" — that requires
--      a resolved tenant per request, which is phase B3's job. Until then
--      this stays `using (true)` for anon, same as properties and
--      homepage_sections already do, and the app filters by tenant_id in the
--      query. lib/tenant.ts's getPrimaryTenantId() is today's placeholder for
--      that resolution.
--
--   2. It does not touch check_availability, get_unavailable_dates, or
--      request_addon — none of them reference site_settings. Only
--      get_booking_by_token does, twice, and only its final definition
--      (0006_stay_defaults.sql) is live; 0001 and 0004's earlier versions
--      were already superseded before this migration runs.
--
-- Repeats a lesson from 0013: a public-read policy must never be granted to
-- `authenticated`. site_settings' OLD shape (public_read using(true) to
-- anon+authenticated, plus a separate admin_update-only policy) had exactly
-- that hole — once there is more than one row, any signed-in admin could read
-- every tenant's business name, contact details and WhatsApp number through
-- the "public" policy, no matter how the admin policy was scoped. Replaced
-- below with the same shape every other tenant-owned table already has.
--
-- Safe to re-run.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Add tenant_id, backfill, lock it down
-- -----------------------------------------------------------------------------

alter table public.site_settings add column if not exists tenant_id uuid;

update public.site_settings
   set tenant_id = (select id from public.tenants order by created_at limit 1)
 where tenant_id is null;

do $$
begin
  if exists (select 1 from public.site_settings where tenant_id is null) then
    raise exception 'site_settings has a row with no resolvable tenant — backfill failed';
  end if;
end $$;

alter table public.site_settings alter column tenant_id set not null;

-- -----------------------------------------------------------------------------
-- 2. Replace the boolean singleton PK with a per-tenant one
-- -----------------------------------------------------------------------------

alter table public.site_settings drop constraint if exists site_settings_singleton;
alter table public.site_settings drop constraint if exists site_settings_pkey;
alter table public.site_settings
  add constraint site_settings_pkey primary key (tenant_id);
alter table public.site_settings
  add constraint site_settings_tenant_fkey
  foreign key (tenant_id) references public.tenants(id) on delete cascade;

alter table public.site_settings drop column if exists id;

-- -----------------------------------------------------------------------------
-- 3. Every new tenant gets a settings row for free
--
-- getSiteSettingsAdmin() throws if the row is missing, so a tenant that could
-- exist without one is a bug waiting to happen the first time someone opens
-- Settings. Guaranteeing it structurally, at the moment the tenant is
-- created, is cheaper than remembering to do it from every place a tenant
-- can be created (today: the 0011 seed; from B7 on: the invite flow too).
-- -----------------------------------------------------------------------------

create or replace function public.create_default_site_settings()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  insert into public.site_settings (tenant_id, business_name)
  values (new.id, new.name)
  on conflict (tenant_id) do nothing;
  return new;
end $$;

drop trigger if exists tenants_create_site_settings on public.tenants;
create trigger tenants_create_site_settings after insert on public.tenants
  for each row execute function public.create_default_site_settings();

-- -----------------------------------------------------------------------------
-- 4. RLS
-- -----------------------------------------------------------------------------

drop policy if exists site_settings_public_read on public.site_settings;
create policy site_settings_public_read on public.site_settings
  for select to anon using (true);

drop policy if exists site_settings_admin_update on public.site_settings;
drop policy if exists site_settings_admin_all on public.site_settings;
create policy site_settings_admin_all on public.site_settings
  for all to authenticated
  using (tenant_id = any(public.current_tenant_ids()))
  with check (tenant_id = any(public.current_tenant_ids()));

create index if not exists site_settings_tenant_idx on public.site_settings (tenant_id);

-- -----------------------------------------------------------------------------
-- 5. get_booking_by_token: join site_settings by tenant instead of `s.id`
--
-- v_booking.tenant_id exists as of phase B1 — the guest-portal bundle now
-- resolves the RIGHT tenant's settings rather than "the" settings, without
-- needing to know anything about which property or tenant it's serving ahead
-- of time. Every other line of this function is reproduced verbatim from
-- 0006_stay_defaults.sql; only the two `s.id` conditions changed.
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
        'slug', p.slug,
        'title', p.title,
        'area', p.area,
        'city', p.city,
        'check_in_time', coalesce(p.check_in_time, s.default_check_in_time),
        'check_out_time', coalesce(p.check_out_time, s.default_check_out_time),
        'house_rules', p.house_rules,
        'max_guests', p.max_guests,
        'images', coalesce((
          select jsonb_agg(jsonb_build_object('storage_path', i.storage_path, 'alt', i.alt)
                           order by i.is_cover desc, i.sort_order)
            from public.property_images i where i.property_id = p.id
        ), '[]'::jsonb)
      )
        from public.properties p, public.site_settings s
       where p.id = v_booking.property_id and s.tenant_id = v_booking.tenant_id
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
      ) from public.site_settings s where s.tenant_id = v_booking.tenant_id
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke execute on function public.get_booking_by_token(text) from public;
grant execute on function public.get_booking_by_token(text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 6. Verify
-- -----------------------------------------------------------------------------

do $$
declare
  v_tenants int;
  v_settings int;
begin
  select count(*) into v_tenants from public.tenants;
  select count(*) into v_settings from public.site_settings;
  if v_tenants <> v_settings then
    raise exception 'tenant/site_settings count mismatch: % tenants, % settings rows', v_tenants, v_settings;
  end if;
  raise notice 'site_settings: % row(s), one per tenant, PK is tenant_id.', v_settings;
end $$;

-- Confirm your one row after running:
--
--   select tenant_id, business_name from public.site_settings;
