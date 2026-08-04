-- =============================================================================
-- Multi-tenant foundation (phase B0 of docs/saas-multi-tenant-plan.md)
--
-- Purely additive. Nothing existing changes behaviour: no column is added to
-- an existing data table, no policy is rewritten, and the app does not read
-- any of this yet. Phase B1 is what actually puts tenant_id on the data and
-- rewrites RLS — this migration only establishes who tenants are and who
-- belongs to them, so that the far riskier B1 has solid ground to stand on.
--
-- Safe to re-run.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Tenants
-- -----------------------------------------------------------------------------

create table if not exists public.tenants (
  id            uuid primary key default gen_random_uuid(),
  -- The public URL segment: /s/{slug} today, {slug}.domain.com later.
  slug          text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name          text not null check (char_length(name) between 1 and 160),
  -- Reserved for the later custom-domain phase (B10). Null until then.
  custom_domain text unique,
  -- invited        → created, owner not yet signed in
  -- awaiting_payment → signed in, blocked until paid
  -- active         → full access
  -- suspended      → non-payment; admin blocked AND public site stops serving
  -- cancelled      → terminal
  status        text not null default 'invited'
                  check (status in ('invited','awaiting_payment','active','suspended','cancelled')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

drop trigger if exists tenants_set_updated_at on public.tenants;
create trigger tenants_set_updated_at before update on public.tenants
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 2. Membership
--
-- A join table rather than a tenant_id column on admin_users: staff accounts
-- under one owner are a near-certain follow-up, and retrofitting this once
-- there are live customers means migrating auth data under load. It costs
-- almost nothing to get right now.
-- -----------------------------------------------------------------------------

create table if not exists public.tenant_members (
  tenant_id  uuid not null references public.tenants(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'owner' check (role in ('owner','staff')),
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

create index if not exists tenant_members_user_idx on public.tenant_members (user_id);

-- Superadmin is a property of the person, not of a tenant — they sit above
-- all of them, so it belongs on admin_users rather than in tenant_members.
alter table public.admin_users
  add column if not exists is_superadmin boolean not null default false;

-- -----------------------------------------------------------------------------
-- 3. Authorization helpers
--
-- Both are SECURITY DEFINER so that policies ON tenant_members can call them
-- without recursing into tenant_members' own RLS.
-- -----------------------------------------------------------------------------

create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.admin_users
     where user_id = auth.uid() and is_superadmin
  );
$$;

revoke execute on function public.is_superadmin() from public;
grant execute on function public.is_superadmin() to anon, authenticated;

/**
 * Every tenant the current user may act on. This is the single expression
 * that phase B1's policies will be written against, so that "which tenants
 * can I see" is defined in exactly one place rather than restated in forty
 * policies that can drift.
 *
 * A superadmin gets all of them — the app narrows to one at a time via the
 * impersonation cookie (phase B6), but the database deliberately permits the
 * whole set so support can actually fix a customer's data.
 */
create or replace function public.current_tenant_ids()
returns uuid[]
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    when public.is_superadmin() then array(select id from public.tenants)
    else coalesce(
      array(select tenant_id from public.tenant_members where user_id = auth.uid()),
      '{}'::uuid[]
    )
  end;
$$;

revoke execute on function public.current_tenant_ids() from public;
grant execute on function public.current_tenant_ids() to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 4. RLS
-- -----------------------------------------------------------------------------

alter table public.tenants enable row level security;
alter table public.tenant_members enable row level security;

-- Public read on tenants is required, not incidental: the public site runs on
-- the anon key and has to resolve /s/{slug} (later a Host header) to a tenant
-- before it can render anything. Slugs and custom domains are public URLs by
-- definition.
--
-- The tradeoff accepted here is that the tenant list is enumerable. For an
-- invite-only platform whose customers' sites are public anyway, that is not
-- meaningfully sensitive. Revisit if the customer list ever becomes
-- competitive information.
drop policy if exists tenants_public_read on public.tenants;
create policy tenants_public_read on public.tenants
  for select to anon, authenticated using (true);

-- Only superadmins create, rename or change the status of a tenant. Owners
-- edit their *content* (settings, listings, homepage), never their own
-- billing status — that would let a suspended tenant un-suspend itself.
drop policy if exists tenants_superadmin_write on public.tenants;
create policy tenants_superadmin_write on public.tenants
  for all to authenticated
  using (public.is_superadmin()) with check (public.is_superadmin());

-- Written against auth.uid() directly rather than through current_tenant_ids()
-- — this is the table that function reads, and keeping the policy independent
-- of it removes any chance of a recursion surprise later.
drop policy if exists tenant_members_self_read on public.tenant_members;
create policy tenant_members_self_read on public.tenant_members
  for select to authenticated
  using (user_id = auth.uid() or public.is_superadmin());

drop policy if exists tenant_members_superadmin_write on public.tenant_members;
create policy tenant_members_superadmin_write on public.tenant_members
  for all to authenticated
  using (public.is_superadmin()) with check (public.is_superadmin());

-- -----------------------------------------------------------------------------
-- 5. Seed the existing installation as tenant #1
--
-- Everything already in this database belongs to one operator. This creates
-- their tenant and enrols every current admin as an owner, so that when B1
-- backfills tenant_id there is exactly one correct answer for every row.
--
-- On superadmin: today public.is_admin() grants every admin_users row
-- unrestricted access to every table. Marking those same people superadmin
-- therefore takes nothing away and grants nothing new — it preserves the
-- status quo through the transition. Any admin added *after* this migration
-- defaults to is_superadmin = false, which is the right default from here on.
-- -----------------------------------------------------------------------------

do $$
declare
  v_name text;
  v_slug text;
  v_tenant_id uuid;
begin
  -- Already seeded (re-run) — leave everything alone.
  if exists (select 1 from public.tenants) then
    raise notice 'tenants table is not empty; skipping seed';
    return;
  end if;

  select coalesce(nullif(trim(business_name), ''), 'Primary')
    into v_name
    from public.site_settings
   limit 1;
  v_name := coalesce(v_name, 'Primary');

  -- slugify(name): lowercase, non-alphanumerics collapse to a single dash,
  -- dashes trimmed off both ends.
  v_slug := trim(both '-' from lower(regexp_replace(v_name, '[^a-zA-Z0-9]+', '-', 'g')));
  if v_slug is null or v_slug = '' then
    v_slug := 'primary';
  end if;

  insert into public.tenants (slug, name, status)
  values (v_slug, v_name, 'active')
  returning id into v_tenant_id;

  insert into public.tenant_members (tenant_id, user_id, role)
  select v_tenant_id, user_id, 'owner' from public.admin_users
  on conflict do nothing;

  update public.admin_users set is_superadmin = true;

  raise notice 'Seeded tenant "%" with slug "%" (id %)', v_name, v_slug, v_tenant_id;
end $$;

-- After running, confirm the slug you got — it becomes the public URL prefix
-- in phase B3 and the PRIMARY_TENANT_SLUG env var:
--
--   select id, slug, name, status from public.tenants;
--
-- Rename it now if you don't like it; nothing depends on it yet:
--
--   update public.tenants set slug = 'kailasha' where slug = '<what you got>';
