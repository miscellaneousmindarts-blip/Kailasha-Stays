-- =============================================================================
-- Move the primary tenant onto its own subdomain (phase C3)
--
-- This is a DATA migration, and it is the one that actually moves a live,
-- ranking site. Everything before it built the mechanism; this throws the
-- switch.
--
-- What changes the moment this runs, for this tenant only:
--   - canonical tags, OG URLs, sitemap and robots.txt name
--     kailasha-stays.deogharbnb.space instead of kailasha-stays.vercel.app
--   - internal links go bare (/properties/x), because tenantBasePath()
--     returns "" once canonical_host is set
--   - new guest portal links are issued on the new host
--
-- PRECONDITION, and it is not optional: that host must already serve. Bare
-- links only resolve on the tenant's own host, and a canonical tag pointing
-- somewhere without a TLS certificate is worse for search than the wrong
-- canonical it replaces. Verified before writing this — the wildcard
-- certificate is live and the subdomain returns 200.
--
-- Old URLs keep working: kailasha-stays.vercel.app 301s to the new host from
-- the proxy (except /api — see proxy.ts), and the apex keeps serving this
-- tenant until phase C4 gives it a landing page of its own.
--
-- Safe to re-run: the update is guarded on canonical_host being null, so a
-- second run is a no-op rather than an overwrite of a later manual change.
-- =============================================================================

do $$
declare
  v_slug text := 'kailasha-stays';
  v_host text := 'kailasha-stays.deogharbnb.space';
  v_current text;
begin
  select canonical_host into v_current
    from public.tenants where slug = v_slug;

  if not found then
    raise exception 'No tenant with slug "%". Check the slug before running this.', v_slug;
  end if;

  if v_current is not null then
    raise notice 'Tenant "%" already has canonical_host "%" — leaving it alone.', v_slug, v_current;
    return;
  end if;

  update public.tenants
     set canonical_host = v_host
   where slug = v_slug;

  raise notice 'Tenant "%" now canonical at %', v_slug, v_host;
end $$;

-- Confirm afterwards:
--   select slug, canonical_host, status from public.tenants order by created_at;
