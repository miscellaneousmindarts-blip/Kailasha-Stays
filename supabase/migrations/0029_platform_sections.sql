-- =============================================================================
-- Platform (apex) homepage sections
--
-- Makes deogharbnb.space's own homepage editable by the superadmin, the way a
-- 'branded' (Plan B) tenant already edits theirs — see
-- docs/apex-homepage-editor-plan.md.
--
-- WHY A SEPARATE TABLE, NOT A ROW IN homepage_sections
--
-- homepage_sections is tenant-scoped (unique (tenant_id, key), 0012) and every
-- policy on it routes through tenant membership. Giving the apex a row there
-- would mean inventing a fake 'platform' tenant, and tenants is now
-- load-bearing for the plan system (0027): listActiveTenantSlugs(),
-- getPlatformProperties(), listPlatformPropertyPublicSlugs() and the
-- superadmin console all read that table and would each need a guard to
-- exclude the impostor. One missed guard leaks a phantom business into the
-- product. A table of its own has no tenant_id to get wrong.
--
-- WHY content IS SEEDED EMPTY, UNLIKE 0008
--
-- 0008 had to seed the tenant homepage's copy authoritatively, because one
-- code default cannot be right for forty different hosts — so it accepted
-- that improving default copy in code would stop reaching live pages.
--
-- There is exactly one apex, and lib/platform-content.ts already holds its
-- real, current copy with the provenance comments that explain where each
-- figure came from. So the rows below seed content = '{}' and the zod schema
-- defaults (built from those consts) supply the copy. Effects:
--
--   * Applying this migration changes nothing visible.
--   * Until a section is edited, improving its copy in code still ships.
--   * The moment it IS edited, the save writes every field of that section,
--     so the row becomes authoritative wholesale from then on — an emptied
--     list stores as [] and reads back as [], never as "fall back to code".
--     (zod .default() fires on an ABSENT key, not on a present empty one.)
--
-- Safe to re-run: content is only ever inserted, never reset on conflict, so
-- a second run cannot discard the superadmin's edits.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Table
--
-- Deliberately narrower than homepage_sections: no tenant_id (there is one
-- apex), and no kind/type (there are no custom sections — the apex is a
-- designed narrative, and letting someone append a free-form block to the
-- platform's own shopfront is a feature nobody asked for). `key` doubles as
-- the type: it names the component that renders it.
-- -----------------------------------------------------------------------------
create table if not exists public.platform_sections (
  id          uuid primary key default gen_random_uuid(),
  -- Slug-shaped so it is safe to use as an #anchor, same rule as
  -- homepage_sections.key.
  key         text not null unique
                check (key ~ '^[a-z0-9]+(_[a-z0-9]+)*$' and char_length(key) <= 60),
  content     jsonb not null default '{}'::jsonb,
  visible     boolean not null default true,
  -- A homepage with no hero, no homes, or no closing CTA is broken in a way
  -- no amount of admin freedom justifies. These can be edited, never hidden.
  can_hide    boolean not null default true,
  -- Enforces "hero first, closing CTA last" at the database rather than
  -- trusting every future reorder path to check. Same shape as
  -- homepage_sections.pin (0008).
  pin         text check (pin in ('first', 'last')),
  sort_order  int not null default 0,
  updated_at  timestamptz not null default now()
);

create index if not exists platform_sections_order_idx
  on public.platform_sections (sort_order);

-- At most one section may claim each end of the page.
create unique index if not exists platform_sections_pin_unique
  on public.platform_sections (pin)
  where pin is not null;

drop trigger if exists platform_sections_set_updated_at on public.platform_sections;
create trigger platform_sections_set_updated_at before update on public.platform_sections
  for each row execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- 2. Deletion guard
--
-- Every row here is the only handle the builder has on that section. Losing
-- one silently removes a section from the apex with no route back through the
-- UI, so refuse at the database rather than trusting application code.
-- Hiding is the supported way to take a section off the page.
-- -----------------------------------------------------------------------------
create or replace function public.platform_sections_no_delete()
returns trigger
language plpgsql
as $$
begin
  raise exception
    'platform_sections rows cannot be deleted — set visible = false to take the section off the page';
  return null;
end;
$$;

drop trigger if exists platform_sections_protect on public.platform_sections;
create trigger platform_sections_protect before delete on public.platform_sections
  for each row execute function public.platform_sections_no_delete();


-- -----------------------------------------------------------------------------
-- 3. RLS
--
-- Read is anonymous: the apex homepage is a public, unauthenticated page and
-- renders straight from these rows. Write is superadmin only — a tenant owner
-- has no business editing the platform's own shopfront, and is_admin() would
-- let every one of them do exactly that.
-- -----------------------------------------------------------------------------
alter table public.platform_sections enable row level security;

drop policy if exists platform_sections_public_read on public.platform_sections;
create policy platform_sections_public_read on public.platform_sections
  for select to anon, authenticated using (true);

drop policy if exists platform_sections_superadmin_write on public.platform_sections;
create policy platform_sections_superadmin_write on public.platform_sections
  for all to authenticated
  using (public.is_superadmin()) with check (public.is_superadmin());


-- -----------------------------------------------------------------------------
-- 4. Platform media library
--
-- homepage_images cannot host these: 0012 made its tenant_id NOT NULL, and
-- that constraint is exactly what keeps one host's library out of another's.
-- Relaxing it to let null mean "platform-owned" would weaken tenant isolation
-- across every existing media query to save one table — a bad trade.
--
-- Same column shape as homepage_images (minus tenant_id) so the existing
-- media panel and picker generalise over both without the two diverging.
--
-- storage_path holds EITHER a homepage-media bucket path OR a /public path —
-- imageUrl() passes `/`-prefixed values straight through. That is how
-- /images/platform/hero.jpg can join this library later without moving.
--
-- No new storage bucket and no new storage policy: the homepage-media bucket
-- (0008) gates writes on is_admin(), and is_superadmin() is a strict subset of
-- it — both read admin_users, one just also requires the is_superadmin flag —
-- so a superadmin already passes. Uploads work as-is; this table only records
-- what was uploaded.
--
-- Deliberately NOT seeded: resolvePlatformHeroImage() returns null when that
-- file is absent, and today it may well be. Seeding a row for it would point
-- the hero at a file that might not exist, turning a clean no-image render
-- into a broken one.
-- -----------------------------------------------------------------------------
create table if not exists public.platform_images (
  id             uuid primary key default gen_random_uuid(),
  storage_path   text not null unique,
  -- For screen readers and search. Never rendered as visible text.
  alt            text check (char_length(alt) <= 300),
  -- The visible caption, where a section renders one.
  title          text check (char_length(title) <= 120),
  -- Drives the amber "Sample photo" badge, same as homepage_images.
  is_placeholder boolean not null default false,
  -- Describes the shot that belongs here while the real one is missing.
  brief          text,
  created_at     timestamptz not null default now()
);

alter table public.platform_images enable row level security;

-- The apex is anonymous, so anon must be able to read the library it renders.
drop policy if exists platform_images_public_read on public.platform_images;
create policy platform_images_public_read on public.platform_images
  for select to anon, authenticated using (true);

drop policy if exists platform_images_superadmin_write on public.platform_images;
create policy platform_images_superadmin_write on public.platform_images
  for all to authenticated
  using (public.is_superadmin()) with check (public.is_superadmin());


-- -----------------------------------------------------------------------------
-- 5. Seed
--
-- Order and keys mirror app/(platform)/page.tsx as it renders today. content
-- stays '{}' on conflict so a re-run never overwrites an edit.
-- -----------------------------------------------------------------------------
insert into public.platform_sections (key, can_hide, pin, sort_order) values
  ('hero',            false, 'first',  0),
  ('homes',           false, null,    10),
  ('savings',         true,  null,    20),
  ('location',        true,  null,    30),
  ('comparison',      true,  null,    40),
  ('what_we_arrange', true,  null,    50),
  ('social_proof',    true,  null,    60),
  ('host_band',       true,  null,    70),
  ('faq',             true,  null,    80),
  ('final_cta',       false, 'last',  90)
on conflict (key) do nothing;


insert into public.schema_migrations (version) values ('0029_platform_sections')
  on conflict (version) do nothing;
