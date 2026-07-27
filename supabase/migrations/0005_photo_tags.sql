-- =============================================================================
-- Photo tags — a short, guest-visible label per photo ("Bedroom", "Balcony").
-- Free text, same shape as alt, but a different purpose: alt is for screen
-- readers and never rendered as visible text; tag is a caption guests see
-- directly on the photo, so gallery scanning doesn't depend on opening every
-- image to figure out what room it is.
-- =============================================================================

alter table public.property_images
  add column if not exists tag text check (char_length(tag) <= 40);
