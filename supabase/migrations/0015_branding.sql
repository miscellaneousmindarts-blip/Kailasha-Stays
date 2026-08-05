-- =============================================================================
-- White-label branding fields (phase B5 of docs/saas-multi-tenant-plan.md)
--
-- Purely additive columns on site_settings, which is already tenant-scoped
-- (0014) — no RLS or trigger changes needed here.
--
-- logo_path / favicon_path store a homepage-media bucket path, the same
-- shape homepage_images.storage_path already uses, rendered through
-- homepageImageUrl(). They are plain columns rather than rows in
-- homepage_images on purpose: a logo isn't a "photo in the library" a section
-- picks from, it's a fixed singleton slot with its own upload/remove action,
-- and putting it in the library would surface it in every section's photo
-- picker for no reason.
--
-- Safe to re-run.
-- =============================================================================

alter table public.site_settings
  add column if not exists logo_path    text,
  add column if not exists favicon_path text,
  -- Validated the same way a <input type="color"> always emits: #rrggbb.
  add column if not exists brand_color  text
    check (brand_color is null or brand_color ~ '^#[0-9a-fA-F]{6}$'),
  -- The registered/legal entity name, when it differs from the public-facing
  -- business_name ("Kailasha Stays" vs "Kailasha Hospitality Pvt Ltd") — for
  -- the footer's fine print, not shown anywhere else.
  add column if not exists legal_name   text check (char_length(legal_name) <= 160),
  add column if not exists footer_note  text check (char_length(footer_note) <= 500);

comment on column public.site_settings.logo_path is
  'homepage-media bucket path. Null falls back to business_name as text in the header.';
comment on column public.site_settings.favicon_path is
  'homepage-media bucket path. Null falls back to the app default /favicon.ico.';
comment on column public.site_settings.brand_color is
  'Hex #rrggbb. Null keeps the default terracotta theme.';
