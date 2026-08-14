-- =============================================================================
-- Guest portal branding follows the tenant's plan, not just their settings
--
-- A 'listing' (Plan A) tenant has no homepage or branding of their own
-- (0027) — a guest booking with them must not see a "Kailasha Stays"-style
-- portal for a business that has no site anywhere. The portal branches on
-- plan in app/(public)/stay/[token]/layout.tsx and page.tsx's
-- generateMetadata; both need to know the plan, and the only way they know
-- anything about the booking is this RPC's return value.
--
-- Full create-or-replace, reproducing 0023_booking_pricing_breakdown.sql's
-- body verbatim plus one new top-level key ('tenant_plan') — the established
-- pattern for this SECURITY DEFINER function on the guest-facing critical
-- path (see that migration's own note on why this isn't a smaller ALTER).
--
-- Safe to re-run.
-- =============================================================================

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
    ),
    -- New in 0028: 'listing' (Plan A) tenants have no site or branding of
    -- their own (0027) — the guest portal layout uses this to render
    -- Deoghar BnB's own identity instead of the tenant's site_settings for
    -- them, rather than showing a "business" that has no site anywhere.
    'tenant_plan', (
      select t.plan from public.tenants t where t.id = v_booking.tenant_id
    )
  ) into v_result;

  return v_result;
end;
$$;

insert into public.schema_migrations (version) values ('0028_guest_portal_plan')
  on conflict (version) do nothing;
