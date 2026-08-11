-- =============================================================================
-- Itemised booking price: editable per-night rates + free-form charges
--
-- Until now a booking carried exactly one number, total_amount, typed in
-- directly with no record of how it was arrived at. This adds the record:
--
--   nightly_rates  — one {date, rate} entry per night of the stay
--   charges        — a free-form list of {label, kind, amount} lines,
--                    kind is 'charge' (adds) or 'discount' (subtracts)
--
-- total_amount stays the column every other part of the app already reads
-- (billing.due, payments, admin lists, the iCal feed never touches it, RLS
-- doesn't care) — it is NOT superseded, it is now COMPUTED from these two
-- and written alongside them in the same update, by the server action, not
-- a trigger. That keeps the single-source-of-truth property without asking
-- every existing total_amount reader to learn a new shape.
--
-- nightly_rates is nullable and charges defaults to '[]': together they mean
-- "never itemised" for every booking that exists today, and the admin UI
-- falls back to showing the plain total exactly as it always has, for both
-- the admin and the guest portal. Itemising is opt-in per booking, not a
-- backfill.
--
-- Safe to re-run.
-- =============================================================================

alter table public.bookings
  add column if not exists nightly_rates jsonb,
  add column if not exists charges jsonb not null default '[]'::jsonb;

comment on column public.bookings.nightly_rates is
  'Array of {date, rate} — one entry per night of the stay, admin-editable. '
  'Null means this booking has never been itemised; total_amount is then a plain figure '
  'with no breakdown behind it, and the UI shows it that way to both the admin and the guest.';
comment on column public.bookings.charges is
  'Array of {id, label, kind, amount} — kind is ''charge'' (adds to the total) or ''discount'' '
  '(subtracts). Independent of nightly_rates: a booking can have charges with no per-night '
  'breakdown, or vice versa. Always an array, never null — an empty list is the normal case.';

-- get_booking_by_token: 'billing' gains the two fields above, verbatim from
-- 0018_room_service_menu.sql otherwise, so the guest portal can render the
-- exact same breakdown the admin built rather than just the final number.
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
        'room_service_link', p.room_service_link,
        'room_service_pdf_path', p.room_service_pdf_path,
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
        'nightly_rates', v_booking.nightly_rates,
        'charges', v_booking.charges,
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
               'id', gd.id, 'guest_name', gd.guest_name, 'doc_type', gd.doc_type,
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
        'response_note', s.response_note,
        'address', s.address,
        'logo_path', s.logo_path,
        'favicon_path', s.favicon_path,
        'brand_color', s.brand_color,
        'legal_name', s.legal_name,
        'footer_note', s.footer_note
      ) from public.site_settings s where s.tenant_id = v_booking.tenant_id
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke execute on function public.get_booking_by_token(text) from public;
grant execute on function public.get_booking_by_token(text) to anon, authenticated;
