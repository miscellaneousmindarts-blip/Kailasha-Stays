-- =============================================================================
-- Canonical host per tenant (phase C2 of docs/saas-multi-tenant-plan.md)
--
-- One column, and it is the switch that moves a tenant onto its own domain.
--
-- NULL (the default, and the state every existing tenant starts in) means
-- "this tenant is still served the old way": absolute URLs are built from
-- NEXT_PUBLIC_SITE_URL and internal links keep their /s/{slug} prefix. So
-- this migration changes no behaviour on its own — it only adds the place
-- where the answer will live.
--
-- Setting it flips that tenant, and only that tenant, completely: links go
-- bare, canonical tags and the sitemap point at the new host, and the guest
-- portal link follows. That is deliberately one switch rather than several,
-- because a tenant that is half-moved is worse than one that hasn't moved:
-- bare links only resolve correctly on the tenant's own host.
--
-- It is therefore NOT safe to set this until that host actually serves —
-- which for {slug}.deogharbnb.space means the wildcard certificate exists.
-- Phase C3 is where that gets verified and the column gets set.
--
-- Safe to re-run.
-- =============================================================================

alter table public.tenants
  add column if not exists canonical_host text;

-- Unique, because two tenants answering to the same hostname is not a
-- degraded state — it is one tenant's site silently serving another's.
create unique index if not exists tenants_canonical_host_key
  on public.tenants (canonical_host)
  where canonical_host is not null;

-- A bare hostname: no scheme, no port, no path, no trailing dot. The app
-- builds "https://" || canonical_host, so anything else here produces a
-- broken absolute URL on every page of that tenant's site — worth refusing
-- at the column rather than discovering in a canonical tag.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'tenants_canonical_host_format'
  ) then
    alter table public.tenants
      add constraint tenants_canonical_host_format
      check (
        canonical_host is null
        or canonical_host ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'
      );
  end if;
end $$;

comment on column public.tenants.canonical_host is
  'The one hostname this tenant''s site is canonical at, e.g. archana.deogharbnb.space. '
  'NULL = still served at NEXT_PUBLIC_SITE_URL under its /s/{slug} prefix. '
  'Setting it moves the tenant onto its own host in full; only set it once that host serves.';
