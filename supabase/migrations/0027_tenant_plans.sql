-- =============================================================================
-- Two tenant plans, and stable apex URLs for every property
--
-- ── 1. tenants.plan ──────────────────────────────────────────────────────
--
--   'listing'  (Plan A) — the property is listed on deogharbnb.space and
--                         nowhere else. The owner still gets a full admin
--                         login; they just have no site or branding of their
--                         own. {slug}.deogharbnb.space does not serve.
--   'branded'  (Plan B) — today's behaviour: their own subdomain, homepage,
--                         logo, colours, the lot. Their properties ALSO
--                         appear on the apex, but reached from there they
--                         behave exactly like a Plan A listing — the guest
--                         stays on deogharbnb.space and never crosses into
--                         the owner's own site.
--
-- The default is deliberately set twice. Adding the column with default
-- 'branded' is what backfills the tenants that already exist — every one of
-- them predates the plan split and has a live branded site, so silently
-- moving them to 'listing' would take those sites offline. Immediately
-- re-pointing the default at 'listing' is what makes 'listing' the entry
-- plan for everyone created from here on. Doing it in two statements rather
-- than one UPDATE keeps this migration safe to re-run: an UPDATE guarded on
-- `plan = 'listing'` would silently promote genuine Plan A tenants to
-- branded the second time it ran.
--
-- ── 2. properties.public_slug ────────────────────────────────────────────
--
-- The apex needs a URL per property that is unique across ALL tenants:
-- deogharbnb.space/stays/{public_slug}. properties.slug cannot serve — it is
-- only unique per (tenant_id, slug) since 0012, and in a market this narrow
-- two owners both naming a listing "premium-2bhk-apartment" is likely rather
-- than hypothetical.
--
-- Assigned once, on insert, and never rewritten when the tenant edits their
-- own slug — a public URL that changes under an indexed page costs more than
-- a slightly stale-looking one.
--
-- Safe to re-run.
-- =============================================================================

-- ── 1. Plans ─────────────────────────────────────────────────────────────

alter table public.tenants
  add column if not exists plan text not null default 'branded'
    check (plan in ('listing', 'branded'));

-- Everything above this line applies to rows that already existed. Everything
-- created from here on starts on the entry plan.
alter table public.tenants alter column plan set default 'listing';

comment on column public.tenants.plan is
  '''listing'': listed on the apex only — no subdomain, no homepage, no branding, '
  'but a full admin login. ''branded'': own subdomain and homepage as well. A '
  'branded tenant''s properties still appear on the apex, where they behave as '
  'listings — see docs/tenant-plans-plan.md.';

-- ── 2. Apex-facing property slugs ────────────────────────────────────────

alter table public.properties
  add column if not exists public_slug text;

comment on column public.properties.public_slug is
  'Globally unique across every tenant — the apex address at '
  '/stays/{public_slug}. properties.slug is only unique per tenant and cannot '
  'be used here. Assigned on insert by properties_set_public_slug and never '
  'rewritten afterwards, so an indexed apex URL stays put.';

-- Backfill. The oldest property keeps the clean slug; later collisions get a
-- numeric suffix, so an existing apex URL can never be reassigned to a
-- different property by a tenant who happens to pick the same name later.
with ranked as (
  select
    id,
    slug,
    row_number() over (partition by slug order by created_at, id) as rn
  from public.properties
  where public_slug is null
)
update public.properties p
   set public_slug = case when r.rn = 1 then r.slug else r.slug || '-' || r.rn end
  from ranked r
 where p.id = r.id;

-- The real guarantee. Nullable + unique is intentional: Postgres allows many
-- NULLs under a unique index, which is what lets the trigger below fill the
-- value in a BEFORE INSERT rather than the caller having to know about it.
create unique index if not exists properties_public_slug_key
  on public.properties (public_slug);

/**
 * Picks the first free `slug`, `slug-2`, `slug-3`… for a new property.
 *
 * The loop races against a concurrent insert of the same base slug; the
 * unique index above is what actually settles that, and the loser sees a
 * constraint violation rather than a duplicate URL. Two owners creating
 * identically-named properties in the same instant is not a load profile
 * this admin panel has, and the failure mode is a retry rather than a
 * silently wrong address.
 */
create or replace function public.set_property_public_slug()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_base      text;
  v_candidate text;
  v_n         int := 1;
begin
  if new.public_slug is not null and new.public_slug <> '' then
    return new;
  end if;

  v_base := new.slug;
  v_candidate := v_base;

  while exists (
    select 1 from public.properties p
     where p.public_slug = v_candidate
       and p.id <> new.id
  ) loop
    v_n := v_n + 1;
    v_candidate := v_base || '-' || v_n;
  end loop;

  new.public_slug := v_candidate;
  return new;
end;
$$;

drop trigger if exists properties_set_public_slug on public.properties;
create trigger properties_set_public_slug
  before insert on public.properties
  for each row execute function public.set_property_public_slug();

insert into public.schema_migrations (version) values ('0027_tenant_plans')
  on conflict (version) do nothing;
