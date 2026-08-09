-- =============================================================================
-- Separate "this property's photo gallery" from "a photo uploaded for one
-- page-builder block"
--
-- The distances block's editor (DistancesEditor / PropertyMediaPicker) lets
-- an admin upload a photo of a nearby LANDMARK — a temple, a station — right
-- from the block, since that photo almost never already exists in the
-- property's own gallery. That upload went through the exact same
-- uploadPropertyImage() action and property_images row as a real gallery
-- photo, so every landmark photo silently became: visible in the Photos tab,
-- eligible to be picked as the cover image, and rendered in the guest-facing
-- gallery carousel alongside actual photos of the property. A photo of a
-- temple 1.4km away has no business in "photos of this apartment."
--
-- in_gallery, default true, is the fix. Existing rows are all real gallery
-- photos (the distances block has been able to reference existing photos
-- since it shipped, but could not UPLOAD a new one until the picker existed)
-- so the default needs no backfill logic beyond the column default itself.
--
-- Enforced at RLS, not just in application code: the public read policy now
-- excludes in_gallery = false outright, so a query written incorrectly later
-- fails closed (shows nothing extra) rather than open (leaks a landmark
-- photo into the guest gallery). Same lesson as B1's public-read audit on
-- the multi-tenant work — the policy is the backstop, not the application
-- code's good behaviour.
--
-- Safe to re-run.
-- =============================================================================

alter table public.property_images
  add column if not exists in_gallery boolean not null default true;

comment on column public.property_images.in_gallery is
  'false for a photo uploaded from inside a page-builder block (e.g. a distances '
  'landmark) rather than the Photos tab — never shown in the guest gallery, the '
  'Photos tab list, or eligible to become the cover image.';

drop policy if exists property_images_public_read on public.property_images;
create policy property_images_public_read on public.property_images
  for select to anon using (
    in_gallery
    and exists (select 1 from public.properties p
                where p.id = property_id and p.status = 'published')
  );
