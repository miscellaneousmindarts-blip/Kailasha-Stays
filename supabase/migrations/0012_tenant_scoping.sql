-- =============================================================================
-- Tenant scoping (phase B1 of docs/saas-multi-tenant-plan.md)
--
-- Puts tenant_id on every tenant-owned table, backfills it to the tenant
-- seeded in 0011, makes cross-tenant rows structurally impossible, and
-- rewrites every admin RLS policy from "is this person an admin" to "is this
-- row in a tenant this person may act on".
--
-- This is the highest-risk migration in the project. Three things make it
-- safe to run against a live single-tenant database:
--
--   1. NOTHING BREAKS WITHOUT APP CHANGES. tenant_id is NOT NULL, but BEFORE
--      INSERT triggers derive it — from the parent row for child tables, from
--      the caller's own membership for top-level ones. Existing inserts,
--      including the SECURITY DEFINER RPCs the public site uses, keep working
--      untouched. Phase B4's app-side filtering is then defence in depth
--      rather than a prerequisite.
--
--   2. NOBODY CAN BE LOCKED OUT. 0011 enrolled every existing admin as an
--      owner AND marked them superadmin, so current_tenant_ids() returns a
--      non-empty set for them the moment these policies go live.
--
--   3. INTEGRITY IS STRUCTURAL, NOT CONVENTIONAL. Child tables get composite
--      foreign keys on (parent_id, tenant_id), so the database itself refuses
--      a row whose tenant disagrees with its parent's. No trigger to forget,
--      no join in a policy to get subtly wrong.
--
-- Safe to re-run.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Add the column everywhere (nullable for now) and backfill
-- -----------------------------------------------------------------------------

do $$
declare
  t text;
  v_tenant uuid;
begin
  select id into v_tenant from public.tenants order by created_at limit 1;
  if v_tenant is null then
    raise exception 'No tenant exists. Run 0011_tenants.sql first.';
  end if;

  -- Every tenant-owned table. site_settings is deliberately absent: its
  -- primary key changes shape (the `id boolean default true` singleton) and
  -- app code reads it by that key, so it moves in phase B2 with the code.
  foreach t in array array[
    'properties','addon_services','homepage_sections','homepage_images',
    'property_private','property_contacts','property_images','property_sections',
    'rate_periods','calendar_sources','property_addon_services','enquiries',
    'bookings','external_events','booking_addons','payments','guest_documents'
  ] loop
    execute format('alter table public.%I add column if not exists tenant_id uuid', t);
  end loop;

  -- Top-level tables: everything currently in this database belongs to the
  -- one seeded tenant.
  foreach t in array array[
    'properties','addon_services','homepage_sections','homepage_images'
  ] loop
    execute format('update public.%I set tenant_id = %L where tenant_id is null', t, v_tenant);
  end loop;

  -- Property-derived tables.
  foreach t in array array[
    'property_private','property_contacts','property_images','property_sections',
    'rate_periods','calendar_sources','property_addon_services','enquiries',
    'bookings','external_events'
  ] loop
    execute format(
      'update public.%I c set tenant_id = p.tenant_id
         from public.properties p
        where p.id = c.property_id and c.tenant_id is null', t);
  end loop;

  -- Booking-derived tables.
  foreach t in array array['booking_addons','payments','guest_documents'] loop
    execute format(
      'update public.%I c set tenant_id = b.tenant_id
         from public.bookings b
        where b.id = c.booking_id and c.tenant_id is null', t);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 2. Derivation triggers
--
-- These are what let this migration land without touching a line of app code.
-- They are not a temporary bridge: deriving a child's tenant from its parent
-- is the correct permanent behaviour, because the parent is the only source
-- of truth about which tenant a photo or a payment belongs to.
-- -----------------------------------------------------------------------------

/**
 * The tenant to attribute a new top-level row to. Reads membership rather
 * than current_tenant_ids() on purpose: a superadmin's current_tenant_ids()
 * is *every* tenant, which is exactly the wrong answer for "where should
 * this new listing go". Phase B6's impersonation makes this explicit; until
 * then, the operator's own tenant is the right default.
 */
create or replace function public.default_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select tenant_id from public.tenant_members where user_id = auth.uid() limit 1;
$$;

revoke execute on function public.default_tenant_id() from public;
grant execute on function public.default_tenant_id() to anon, authenticated;

create or replace function public.set_tenant_from_property()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  if new.tenant_id is null then
    select tenant_id into new.tenant_id from public.properties where id = new.property_id;
  end if;
  return new;
end $$;

create or replace function public.set_tenant_from_booking()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  if new.tenant_id is null then
    select tenant_id into new.tenant_id from public.bookings where id = new.booking_id;
  end if;
  return new;
end $$;

create or replace function public.set_tenant_default()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  if new.tenant_id is null then
    new.tenant_id := public.default_tenant_id();
  end if;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'property_private','property_contacts','property_images','property_sections',
    'rate_periods','calendar_sources','property_addon_services','enquiries',
    'bookings','external_events'
  ] loop
    execute format('drop trigger if exists %I_set_tenant on public.%I', t, t);
    execute format(
      'create trigger %I_set_tenant before insert on public.%I
         for each row execute function public.set_tenant_from_property()', t, t);
  end loop;

  foreach t in array array['booking_addons','payments','guest_documents'] loop
    execute format('drop trigger if exists %I_set_tenant on public.%I', t, t);
    execute format(
      'create trigger %I_set_tenant before insert on public.%I
         for each row execute function public.set_tenant_from_booking()', t, t);
  end loop;

  foreach t in array array[
    'properties','addon_services','homepage_sections','homepage_images'
  ] loop
    execute format('drop trigger if exists %I_set_tenant on public.%I', t, t);
    execute format(
      'create trigger %I_set_tenant before insert on public.%I
         for each row execute function public.set_tenant_default()', t, t);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 3. Lock the column down
-- -----------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array[
    'properties','addon_services','homepage_sections','homepage_images',
    'property_private','property_contacts','property_images','property_sections',
    'rate_periods','calendar_sources','property_addon_services','enquiries',
    'bookings','external_events','booking_addons','payments','guest_documents'
  ] loop
    execute format('alter table public.%I alter column tenant_id set not null', t);
    execute format(
      'create index if not exists %I on public.%I (tenant_id)',
      t || '_tenant_idx', t);
  end loop;
end $$;

-- Top-level tables reference tenants directly. Child tables get their FK via
-- the composite constraints in §4, which transitively guarantee the same.
alter table public.properties        drop constraint if exists properties_tenant_fkey;
alter table public.properties        add  constraint properties_tenant_fkey
  foreign key (tenant_id) references public.tenants(id) on delete cascade;
alter table public.addon_services    drop constraint if exists addon_services_tenant_fkey;
alter table public.addon_services    add  constraint addon_services_tenant_fkey
  foreign key (tenant_id) references public.tenants(id) on delete cascade;
alter table public.homepage_sections drop constraint if exists homepage_sections_tenant_fkey;
alter table public.homepage_sections add  constraint homepage_sections_tenant_fkey
  foreign key (tenant_id) references public.tenants(id) on delete cascade;
alter table public.homepage_images   drop constraint if exists homepage_images_tenant_fkey;
alter table public.homepage_images   add  constraint homepage_images_tenant_fkey
  foreign key (tenant_id) references public.tenants(id) on delete cascade;

-- -----------------------------------------------------------------------------
-- 4. Composite foreign keys — a child can never disagree with its parent
--
-- Delete rules are preserved exactly as they were on the simple FKs these
-- replace: cascade for owned detail, restrict for enquiries and bookings
-- (which must block deleting a property that has real history against it).
--
-- Deliberately NOT made composite: bookings.enquiry_id and
-- booking_addons.addon_service_id. Both are ON DELETE SET NULL, and a
-- composite version would try to null tenant_id too — which is NOT NULL, so
-- the delete would fail. Their tenant is already pinned via property_id /
-- booking_id.
-- -----------------------------------------------------------------------------

alter table public.properties     drop constraint if exists properties_id_tenant_key;
alter table public.properties     add  constraint properties_id_tenant_key unique (id, tenant_id);
alter table public.bookings       drop constraint if exists bookings_id_tenant_key;
alter table public.bookings       add  constraint bookings_id_tenant_key unique (id, tenant_id);
alter table public.addon_services drop constraint if exists addon_services_id_tenant_key;
alter table public.addon_services add  constraint addon_services_id_tenant_key unique (id, tenant_id);

do $$
declare
  r record;
  t text;
begin
  for r in
    select * from (values
      ('property_private',        'cascade'),
      ('property_contacts',       'cascade'),
      ('property_images',         'cascade'),
      ('property_sections',       'cascade'),
      ('rate_periods',            'cascade'),
      ('calendar_sources',        'cascade'),
      ('property_addon_services', 'cascade'),
      ('external_events',         'cascade'),
      ('enquiries',               'restrict'),
      ('bookings',                'restrict')
    ) as v(tbl, del)
  loop
    execute format('alter table public.%I drop constraint if exists %I', r.tbl, r.tbl || '_property_id_fkey');
    execute format('alter table public.%I drop constraint if exists %I', r.tbl, r.tbl || '_property_tenant_fkey');
    execute format(
      'alter table public.%I add constraint %I
         foreign key (property_id, tenant_id)
         references public.properties (id, tenant_id) on delete %s',
      r.tbl, r.tbl || '_property_tenant_fkey', r.del);
  end loop;

  foreach t in array array['booking_addons','payments','guest_documents'] loop
    execute format('alter table public.%I drop constraint if exists %I', t, t || '_booking_id_fkey');
    execute format('alter table public.%I drop constraint if exists %I', t, t || '_booking_tenant_fkey');
    execute format(
      'alter table public.%I add constraint %I
         foreign key (booking_id, tenant_id)
         references public.bookings (id, tenant_id) on delete cascade',
      t, t || '_booking_tenant_fkey');
  end loop;
end $$;

-- A tenant must not be able to switch on another tenant's add-on.
alter table public.property_addon_services
  drop constraint if exists property_addon_services_addon_service_id_fkey;
alter table public.property_addon_services
  drop constraint if exists property_addon_services_addon_tenant_fkey;
alter table public.property_addon_services
  add constraint property_addon_services_addon_tenant_fkey
  foreign key (addon_service_id, tenant_id)
  references public.addon_services (id, tenant_id) on delete cascade;

-- -----------------------------------------------------------------------------
-- 5. Uniqueness becomes per-tenant
--
-- Two owners will both want /luxury-2bhk and both need a section keyed
-- 'hero'. Globally unique would make the second tenant unprovisionable.
--
-- Deliberately left global: bookings.portal_token (guest portal links resolve
-- without knowing a tenant) and homepage_images.storage_path (paths become
-- tenant-prefixed in B8, so global uniqueness is both true and desirable).
-- -----------------------------------------------------------------------------

alter table public.properties drop constraint if exists properties_slug_key;
alter table public.properties drop constraint if exists properties_tenant_slug_key;
alter table public.properties add  constraint properties_tenant_slug_key unique (tenant_id, slug);

alter table public.homepage_sections drop constraint if exists homepage_sections_key_key;
alter table public.homepage_sections drop constraint if exists homepage_sections_tenant_key_key;
alter table public.homepage_sections add  constraint homepage_sections_tenant_key_key unique (tenant_id, key);

drop index if exists public.homepage_sections_pin_unique;
create unique index if not exists homepage_sections_pin_unique
  on public.homepage_sections (tenant_id, pin)
  where pin is not null;

-- -----------------------------------------------------------------------------
-- 6. RLS: from "is an admin" to "is in a tenant I may act on"
--
-- Public-read policies are deliberately untouched. Their semantics are still
-- correct — a published listing is public information — and tenant filtering
-- for public pages happens in the query layer, where the site already knows
-- which tenant it is rendering.
-- -----------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array[
    'properties','addon_services','homepage_sections','homepage_images',
    'property_private','property_contacts','property_images','property_sections',
    'rate_periods','calendar_sources','property_addon_services','enquiries',
    'bookings','external_events','booking_addons','payments','guest_documents'
  ] loop
    execute format('drop policy if exists %I on public.%I', t || '_admin_all', t);
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (tenant_id = any(public.current_tenant_ids()))
         with check (tenant_id = any(public.current_tenant_ids()))',
      t || '_admin_all', t);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 7. Verify
-- -----------------------------------------------------------------------------

do $$
declare
  v_missing int;
begin
  select count(*) into v_missing
    from information_schema.columns c
   where c.table_schema = 'public'
     and c.column_name = 'tenant_id'
     and c.is_nullable = 'YES'
     and c.table_name in (
       'properties','addon_services','homepage_sections','homepage_images',
       'property_private','property_contacts','property_images','property_sections',
       'rate_periods','calendar_sources','property_addon_services','enquiries',
       'bookings','external_events','booking_addons','payments','guest_documents'
     );

  if v_missing > 0 then
    raise exception 'tenant_id still nullable on % table(s)', v_missing;
  end if;

  raise notice 'Tenant scoping applied to 17 tables.';
end $$;

-- After running, every row should report the same tenant and zero orphans:
--
--   select 'properties' t, count(*) n, count(distinct tenant_id) tenants from properties
--   union all select 'bookings', count(*), count(distinct tenant_id) from bookings
--   union all select 'property_images', count(*), count(distinct tenant_id) from property_images
--   union all select 'homepage_sections', count(*), count(distinct tenant_id) from homepage_sections;
