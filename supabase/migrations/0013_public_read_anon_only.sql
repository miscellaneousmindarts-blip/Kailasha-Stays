-- =============================================================================
-- Close the cross-tenant read hole in the public-read policies (phase B1)
--
-- Found by supabase/tests/tenant_isolation.sql, which failed on exactly the
-- eight tables that have a *_public_read policy and none of the nine that
-- don't. That is not a coincidence.
--
-- RLS policies are PERMISSIVE: they OR together. So
--
--     properties_public_read  for select TO ANON, AUTHENTICATED
--                             using (status = 'published')
--
-- kept granting tenant A's logged-in admin every published row belonging to
-- tenant B, no matter how tightly properties_admin_all was scoped. Tightening
-- the admin policy could never have fixed this; the grant was coming from the
-- other side.
--
-- The fix is to stop granting public reads to AUTHENTICATED at all. That is
-- safe because the public site never runs as authenticated: every public page
-- reads through createPublicClient() (lib/supabase/public.ts), which is
-- deliberately cookie-free — "RLS still applies: this sees exactly what a
-- logged-out visitor sees". An admin's session cookie does not reach it, even
-- when the admin is browsing their own site or the builder's preview iframe.
--
-- After this, being signed in as tenant A grants you exactly nothing about
-- tenant B. Anonymous visitors are unaffected.
--
-- site_settings is deliberately excluded: it has no admin SELECT policy of its
-- own, so the admin panel reads it *through* site_settings_public_read.
-- Restricting that would break the settings page. It has no tenant_id yet and
-- moves in phase B2 with the code that reads it.
--
-- Safe to re-run.
-- =============================================================================

drop policy if exists properties_public_read on public.properties;
create policy properties_public_read on public.properties
  for select to anon using (status = 'published');

drop policy if exists property_images_public_read on public.property_images;
create policy property_images_public_read on public.property_images
  for select to anon using (
    exists (select 1 from public.properties p
            where p.id = property_id and p.status = 'published')
  );

drop policy if exists property_sections_public_read on public.property_sections;
create policy property_sections_public_read on public.property_sections
  for select to anon using (
    visible
    and audience in ('public','both')
    and exists (select 1 from public.properties p
                where p.id = property_id and p.status = 'published')
  );

drop policy if exists addon_services_public_read on public.addon_services;
create policy addon_services_public_read on public.addon_services
  for select to anon using (active);

drop policy if exists property_addon_services_public_read on public.property_addon_services;
create policy property_addon_services_public_read on public.property_addon_services
  for select to anon using (
    exists (select 1 from public.properties p
            where p.id = property_id and p.status = 'published')
  );

drop policy if exists rate_periods_public_read on public.rate_periods;
create policy rate_periods_public_read on public.rate_periods
  for select to anon using (
    exists (select 1 from public.properties p
            where p.id = property_id and p.status = 'published')
  );

drop policy if exists homepage_sections_public_read on public.homepage_sections;
create policy homepage_sections_public_read on public.homepage_sections
  for select to anon using (visible);

-- KNOWN GAP, tracked to phase B8: this stays `using (true)`, so an anonymous
-- visitor can still enumerate every tenant's homepage media library — including
-- images not placed on any page — and the homepage-media bucket is public, so
-- the paths it exposes are fetchable.
--
-- Not closed here on purpose. The correct scope ("only images referenced by a
-- visible section") means scanning section jsonb for the image id, and getting
-- that subtly wrong silently blanks photos on a live homepage. B8 re-paths
-- this bucket under {tenantId}/ and rewrites its storage policies, which is
-- where this belongs and where it can be verified against real content.
--
-- Severity in the meantime: public media files of public websites, readable by
-- people who could already read those websites. No bookings, guest details,
-- pricing or private info is involved.
drop policy if exists homepage_images_public_read on public.homepage_images;
create policy homepage_images_public_read on public.homepage_images
  for select to anon using (true);

do $$ begin
  raise notice 'Public-read policies restricted to anon on 8 tables (site_settings deferred to B2).';
end $$;
