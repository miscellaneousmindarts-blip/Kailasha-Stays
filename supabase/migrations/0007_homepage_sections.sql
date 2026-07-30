-- Homepage page builder.
--
-- The landing page's sections stop being a hardcoded list in page.tsx and
-- become rows here: the admin can reorder them, hide them, edit their copy and
-- images, and add new ones from a small set of layouts.
--
-- Two kinds of row, and the distinction matters:
--
--   'builtin'  A section whose markup lives in components/landing/. The row
--              controls its position, visibility, and any copy/image the admin
--              chose to override. `content` is a SPARSE override map — an empty
--              object means "render exactly what the code says", so the tuned
--              default copy stays authoritative until someone deliberately
--              changes a field. These cannot be deleted, only hidden, because
--              deleting one would remove a section the UI has no way to
--              recreate.
--
--   'custom'   A section the admin composed from a layout template. `content`
--              is the whole section — there is no code default to fall back to.
--              Freely added and deleted.
--
-- `type` is free text on purpose, exactly as property_sections.type is: adding
-- a new layout means a registry entry, a renderer and an editor, never a
-- migration. Content is validated with zod on save and again on render, so a
-- malformed row is skipped rather than crashing the homepage.

create table if not exists public.homepage_sections (
  id          uuid primary key default gen_random_uuid(),
  -- Stable identifier the code joins on for builtins ('hero', 'homes', ...).
  -- Slug-shaped so a custom section's key is safe to use as an #anchor.
  key         text not null unique
                check (key ~ '^[a-z0-9]+(_[a-z0-9]+)*$' and char_length(key) <= 60),
  kind        text not null check (kind in ('builtin','custom')),
  type        text not null check (char_length(type) between 1 and 40),
  -- The label shown in the builder's section list, not necessarily on the page.
  title       text check (char_length(title) <= 160),
  content     jsonb not null default '{}'::jsonb,
  visible     boolean not null default true,
  -- Locked sections can be edited but never hidden or moved. The hero is one:
  -- a homepage with no hero, or with the hero in the middle, is broken in a way
  -- no amount of admin freedom justifies.
  locked      boolean not null default false,
  sort_order  int not null default 0,
  updated_at  timestamptz not null default now()
);

create index if not exists homepage_sections_order_idx
  on public.homepage_sections (sort_order);

drop trigger if exists homepage_sections_set_updated_at on public.homepage_sections;
create trigger homepage_sections_set_updated_at before update on public.homepage_sections
  for each row execute function public.set_updated_at();

-- A builtin row is the only handle the admin UI has on that section. Losing one
-- silently removes a section with no route back, so refuse at the database
-- rather than trusting every future code path to check.
create or replace function public.homepage_sections_protect_builtin()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.kind = 'builtin' then
    raise exception 'builtin homepage section % cannot be deleted; hide it instead', old.key;
  end if;
  return old;
end;
$$;

drop trigger if exists homepage_sections_no_builtin_delete on public.homepage_sections;
create trigger homepage_sections_no_builtin_delete before delete on public.homepage_sections
  for each row execute function public.homepage_sections_protect_builtin();

alter table public.homepage_sections enable row level security;

-- Public reads visible sections; the homepage is anonymous, so this has to be
-- readable by anon. Hidden sections stay invisible to everyone but an admin.
drop policy if exists homepage_sections_public_read on public.homepage_sections;
create policy homepage_sections_public_read on public.homepage_sections
  for select to anon, authenticated using (visible);

drop policy if exists homepage_sections_admin_all on public.homepage_sections;
create policy homepage_sections_admin_all on public.homepage_sections
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Seed the builtins in the order the page renders them today, so applying this
-- migration changes nothing visible until the admin edits something.
insert into public.homepage_sections (key, kind, type, title, locked, sort_order) values
  ('hero',           'builtin', 'hero',           'Hero',                    true,   0),
  ('trust_ribbon',   'builtin', 'trust_ribbon',   'Trust ribbon',            false, 10),
  ('map',            'builtin', 'map',            'Where you''ll be',        false, 20),
  ('homes',          'builtin', 'homes',          'Our homes',               true,  30),
  ('why_apartment',  'builtin', 'why_apartment',  'Why a 2BHK + calculator', false, 40),
  ('meet_host',      'builtin', 'meet_host',      'Meet your host',          false, 50),
  ('nothing_hidden', 'builtin', 'nothing_hidden', 'Nothing hidden (photos)', false, 60),
  ('proof',          'builtin', 'proof',          'Reviews and proof',       false, 70),
  ('services',       'builtin', 'services',       'Add-on services',         false, 80),
  ('shravan',        'builtin', 'shravan',        'Shravan notice',          false, 90),
  ('faq',            'builtin', 'faq',            'FAQ',                     false, 100),
  ('close',          'builtin', 'close',          'Closing CTA',             true,  110)
on conflict (key) do nothing;
