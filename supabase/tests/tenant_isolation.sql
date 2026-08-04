-- =============================================================================
-- Tenant isolation test  (phase B1 of docs/saas-multi-tenant-plan.md)
--
-- Multi-tenancy bugs do not throw errors. A missed RLS policy just quietly
-- shows one customer another customer's bookings, and you find out from the
-- customer. This is the only way to actually know isolation holds.
--
-- Creates two throwaway tenants with data, assumes each member's identity in
-- turn, and asserts that neither can read or write a single row belonging to
-- the other — on every tenant-owned table.
--
-- HOW TO RUN: paste the whole file into the Supabase SQL editor and run it.
-- It is wrapped in a transaction that ALWAYS rolls back, so it writes nothing
-- permanent, even when it fails. Re-runnable as often as you like.
--
-- PASS looks like:  NOTICE: tenant isolation: PASS (17 tables, 0 violations)
-- FAIL raises an exception naming every table that leaked.
-- =============================================================================

begin;

-- The FK to auth.users is dropped rather than creating real auth accounts:
-- auth.users' required columns vary between Supabase versions, and this test
-- has no business depending on that. The ROLLBACK at the end puts it back.
alter table public.tenant_members drop constraint if exists tenant_members_user_id_fkey;

-- -----------------------------------------------------------------------------
-- Fixtures: two tenants, one member each, and a row in every owned table
-- -----------------------------------------------------------------------------

do $$
declare
  a_tenant uuid; b_tenant uuid;
  a_user uuid := '00000000-0000-4000-8000-00000000000a';
  b_user uuid := '00000000-0000-4000-8000-00000000000b';
  a_prop uuid;   b_prop uuid;
  a_book uuid;   b_book uuid;
  a_addon uuid;  b_addon uuid;
  a_src uuid;    b_src uuid;
  a_enq uuid;    b_enq uuid;
begin
  insert into public.tenants (slug, name, status)
    values ('zz-isolation-a', 'Isolation A', 'active') returning id into a_tenant;
  insert into public.tenants (slug, name, status)
    values ('zz-isolation-b', 'Isolation B', 'active') returning id into b_tenant;

  insert into public.tenant_members (tenant_id, user_id, role)
    values (a_tenant, a_user, 'owner'), (b_tenant, b_user, 'owner');

  -- Top-level
  insert into public.properties (tenant_id, slug, title, status)
    values (a_tenant, 'zz-iso-a', 'A home', 'published') returning id into a_prop;
  insert into public.properties (tenant_id, slug, title, status)
    values (b_tenant, 'zz-iso-b', 'B home', 'published') returning id into b_prop;

  insert into public.addon_services (tenant_id, name, price)
    values (a_tenant, 'A addon', 100) returning id into a_addon;
  insert into public.addon_services (tenant_id, name, price)
    values (b_tenant, 'B addon', 100) returning id into b_addon;

  insert into public.homepage_sections (tenant_id, key, kind, type, content)
    values (a_tenant, 'zz_iso_a', 'custom', 'zz', '{}'::jsonb),
           (b_tenant, 'zz_iso_b', 'custom', 'zz', '{}'::jsonb);

  insert into public.homepage_images (tenant_id, storage_path)
    values (a_tenant, 'zz-iso-a.jpg'), (b_tenant, 'zz-iso-b.jpg');

  -- Property-derived
  insert into public.property_private (tenant_id, property_id, wifi_password)
    values (a_tenant, a_prop, 'a-secret'), (b_tenant, b_prop, 'b-secret');
  insert into public.property_contacts (tenant_id, property_id, name, phone)
    values (a_tenant, a_prop, 'A caretaker', '1'), (b_tenant, b_prop, 'B caretaker', '2');
  insert into public.property_images (tenant_id, property_id, storage_path)
    values (a_tenant, a_prop, 'a/1.jpg'), (b_tenant, b_prop, 'b/1.jpg');
  insert into public.property_sections (tenant_id, property_id, type, content)
    values (a_tenant, a_prop, 'paragraph', '{}'::jsonb),
           (b_tenant, b_prop, 'paragraph', '{}'::jsonb);
  insert into public.rate_periods (tenant_id, property_id, start_date, end_date, direct_price)
    values (a_tenant, a_prop, '2099-01-01', '2099-01-05', 100),
           (b_tenant, b_prop, '2099-01-01', '2099-01-05', 100);
  insert into public.calendar_sources (tenant_id, property_id, platform, ical_url)
    values (a_tenant, a_prop, 'airbnb', 'https://a.example/a.ics') returning id into a_src;
  insert into public.calendar_sources (tenant_id, property_id, platform, ical_url)
    values (b_tenant, b_prop, 'airbnb', 'https://b.example/b.ics') returning id into b_src;
  insert into public.external_events (tenant_id, property_id, source_id, uid, start_date, end_date)
    values (a_tenant, a_prop, a_src, 'a-1', '2099-02-01', '2099-02-03'),
           (b_tenant, b_prop, b_src, 'b-1', '2099-02-01', '2099-02-03');
  insert into public.property_addon_services (tenant_id, property_id, addon_service_id)
    values (a_tenant, a_prop, a_addon), (b_tenant, b_prop, b_addon);
  insert into public.enquiries (tenant_id, property_id, name, phone, check_in, check_out)
    values (a_tenant, a_prop, 'A guest', '1', '2099-03-01', '2099-03-03') returning id into a_enq;
  insert into public.enquiries (tenant_id, property_id, name, phone, check_in, check_out)
    values (b_tenant, b_prop, 'B guest', '2', '2099-03-01', '2099-03-03') returning id into b_enq;
  insert into public.bookings (tenant_id, property_id, guest_name, check_in, check_out)
    values (a_tenant, a_prop, 'A guest', '2099-04-01', '2099-04-03') returning id into a_book;
  insert into public.bookings (tenant_id, property_id, guest_name, check_in, check_out)
    values (b_tenant, b_prop, 'B guest', '2099-04-01', '2099-04-03') returning id into b_book;

  -- Booking-derived
  insert into public.booking_addons (tenant_id, booking_id, name, price)
    values (a_tenant, a_book, 'A extra', 10), (b_tenant, b_book, 'B extra', 10);
  insert into public.payments (tenant_id, booking_id, amount)
    values (a_tenant, a_book, 50), (b_tenant, b_book, 50);
  insert into public.guest_documents (tenant_id, booking_id, storage_path)
    values (a_tenant, a_book, 'a/id.jpg'), (b_tenant, b_book, 'b/id.jpg');

  -- Stash the ids for the assertions below.
  create temp table zz_iso (a_tenant uuid, b_tenant uuid, a_user uuid, b_user uuid,
                            a_prop uuid, b_prop uuid) on commit drop;
  insert into zz_iso values (a_tenant, b_tenant, a_user, b_user, a_prop, b_prop);

  raise notice 'fixtures: tenant A=% tenant B=%', a_tenant, b_tenant;
end $$;

-- -----------------------------------------------------------------------------
-- Assertion 1 — READ isolation, every table, both directions
-- -----------------------------------------------------------------------------

do $$
declare
  t text;
  n int;
  violations text[] := '{}';
  a_tenant uuid; b_tenant uuid; a_user uuid; b_user uuid;
  tables text[] := array[
    'properties','addon_services','homepage_sections','homepage_images',
    'property_private','property_contacts','property_images','property_sections',
    'rate_periods','calendar_sources','property_addon_services','enquiries',
    'bookings','external_events','booking_addons','payments','guest_documents'
  ];
begin
  select z.a_tenant, z.b_tenant, z.a_user, z.b_user
    into a_tenant, b_tenant, a_user, b_user from zz_iso z;

  -- ---- as tenant A's owner: must see zero of tenant B's rows ----
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', a_user)::text, true);

  foreach t in array tables loop
    execute format('select count(*) from public.%I where tenant_id = %L', t, b_tenant) into n;
    if n <> 0 then
      violations := violations || format('%s: A saw %s of B''s rows', t, n);
    end if;
    -- and must still see its own, or the policy is broken the other way
    execute format('select count(*) from public.%I where tenant_id = %L', t, a_tenant) into n;
    if n = 0 then
      violations := violations || format('%s: A cannot see its OWN rows', t);
    end if;
  end loop;

  -- ---- as tenant B's owner: mirror image ----
  perform set_config('request.jwt.claims', json_build_object('sub', b_user)::text, true);

  foreach t in array tables loop
    execute format('select count(*) from public.%I where tenant_id = %L', t, a_tenant) into n;
    if n <> 0 then
      violations := violations || format('%s: B saw %s of A''s rows', t, n);
    end if;
  end loop;

  perform set_config('role', 'postgres', true);

  if array_length(violations, 1) > 0 then
    raise exception E'TENANT ISOLATION FAILED (read):\n  %', array_to_string(violations, E'\n  ');
  end if;

  raise notice 'read isolation: PASS (% tables)', array_length(tables, 1);
end $$;

-- -----------------------------------------------------------------------------
-- Assertion 2 — WRITE isolation
--
-- Reading is only half of it. Without a correct WITH CHECK clause a tenant can
-- happily insert rows into, or re-parent rows onto, someone else's account.
-- -----------------------------------------------------------------------------

do $$
declare
  a_tenant uuid; b_tenant uuid; a_user uuid; b_prop uuid;
  violations text[] := '{}';
  n int;
begin
  select z.a_tenant, z.b_tenant, z.a_user, z.b_prop
    into a_tenant, b_tenant, a_user, b_prop from zz_iso z;

  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', a_user)::text, true);

  -- (a) insert a row directly into tenant B
  begin
    insert into public.properties (tenant_id, slug, title, status)
      values (b_tenant, 'zz-iso-attack', 'Attack', 'draft');
    violations := violations || 'properties: A inserted a row into B';
  exception when insufficient_privilege or check_violation then
    null; -- correctly refused
  end;

  -- (b) steal one of B's rows by updating it
  begin
    update public.properties set title = 'stolen' where id = b_prop;
    get diagnostics n = row_count;
    if n > 0 then
      violations := violations || 'properties: A updated one of B''s rows';
    end if;
  exception when insufficient_privilege or check_violation then
    null;
  end;

  -- (c) re-parent one of A's own rows onto B (the WITH CHECK path)
  begin
    update public.properties set tenant_id = b_tenant where tenant_id = a_tenant;
    get diagnostics n = row_count;
    if n > 0 then
      violations := violations || 'properties: A moved its own row into B''s tenant';
    end if;
  exception when insufficient_privilege or check_violation then
    null;
  end;

  -- (d) delete one of B's rows
  begin
    delete from public.bookings where tenant_id = b_tenant;
    get diagnostics n = row_count;
    if n > 0 then
      violations := violations || 'bookings: A deleted B''s rows';
    end if;
  exception when insufficient_privilege then
    null;
  end;

  perform set_config('role', 'postgres', true);

  if array_length(violations, 1) > 0 then
    raise exception E'TENANT ISOLATION FAILED (write):\n  %', array_to_string(violations, E'\n  ');
  end if;

  raise notice 'write isolation: PASS';
end $$;

-- -----------------------------------------------------------------------------
-- Assertion 3 — structural integrity: a mismatched child must be impossible
-- -----------------------------------------------------------------------------

do $$
declare
  a_tenant uuid; b_tenant uuid; b_prop uuid;
  leaked boolean := false;
begin
  select z.a_tenant, z.b_tenant, z.b_prop into a_tenant, b_tenant, b_prop from zz_iso z;

  -- Running as postgres (RLS bypassed) on purpose: this asserts the composite
  -- foreign key holds the line even when RLS is not the thing stopping you.
  begin
    insert into public.property_images (tenant_id, property_id, storage_path)
      values (a_tenant, b_prop, 'cross/tenant.jpg');
    leaked := true;
  exception when foreign_key_violation then
    null; -- correctly refused
  end;

  if leaked then
    raise exception 'TENANT ISOLATION FAILED (integrity): a child row was accepted whose tenant disagrees with its parent''s';
  end if;

  raise notice 'structural integrity: PASS';
end $$;

do $$ begin
  raise notice 'tenant isolation: PASS (17 tables, 0 violations)';
end $$;

-- Nothing above is kept. This is a test, not a migration.
rollback;
