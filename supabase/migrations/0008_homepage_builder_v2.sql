-- =============================================================================
-- Homepage builder v2
--
-- ⚠ DO NOT APPLY THIS UNTIL THE FRONTEND REWRITE IS READY TO DEPLOY. ⚠
--
-- The currently deployed renderers read `content` as a SPARSE OVERRIDE MAP and
-- keep any value that happens to be a string (lib/homepage.ts → readOverrides).
-- The seed below is authoritative content containing {tokens}, so the old code
-- would take those strings literally and publish raw placeholders to the live
-- homepage. Verified: six fields break this way —
--
--   hero.heading        "…Deoghar — {temple} from Baba Baidyanath Dham"
--   homes.heading       "{count} {homes}. Each one yours alone."
--   homes.lede          "…sleeping {sleepsRange} : not a hotel room…"
--   meet_host.heading   "Namaste, I''m {hostName}."
--   meet_host.body      "…here {hostYears} years."
--   shravan.promise     "Reserve with {advancePct}% advance…"
--
-- The array and object fields are ignored by the old code and fall back to
-- lib/landing-config.ts, so those are harmless. It is only the strings.
--
-- Apply this together with the frontend change (§8 step 1 of the plan), not
-- ahead of it.
--
-- Makes everything on the homepage that is not pulled from a property listing
-- editable by the owner: real image uploads, repeatable lists (trust ribbon,
-- FAQ, reviews, comparison rows, an unbounded photo grid), and free reordering.
--
-- THE ONE BREAKING CHANGE. In 0007, homepage_sections.content was a SPARSE
-- OVERRIDE MAP: an absent key meant "render the code default". That model
-- cannot express the lists this migration adds, because an empty list is
-- ambiguous between "the owner deleted every item" and "the owner never touched
-- this" — and in a page builder the first reading has to win.
--
-- So content becomes AUTHORITATIVE: the row is the whole section. Every builtin
-- is seeded below with the exact copy the page renders today, so applying this
-- changes nothing visible. The cost is that improving default copy in code will
-- no longer reach the live page; those defaults are now seed data for a fresh
-- install, not a live fallback. That is inherent to a page builder.
--
-- Copy that interpolates a number in code is seeded with a {token} — see
-- docs/homepage-builder-v2-plan.md §2. Resolve tokens server-side, and treat a
-- field (or a single paragraph of a multi-paragraph field) as empty when any
-- token in it resolves to empty. That is what keeps a FAQ answer from rendering
-- as "about  from the temple".
--
-- Not idempotent in spirit: re-running resets seeded content to these defaults
-- and would discard the owner's edits. It is safe to run once, and safe to run
-- before 0007's seed has been touched. sort_order is deliberately NOT reset on
-- conflict, so a re-run cannot scramble an arrangement.
-- =============================================================================


-- =============================================================================
-- 1. Media library
-- =============================================================================

-- A bucket of its own, not a folder inside property-images: homepage assets are
-- not listing photos, and deleting a property must never be able to take out
-- the hero.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'homepage-media', 'homepage-media', true, 10485760,
  array['image/jpeg','image/png','image/webp','image/avif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists homepage_media_public_read on storage.objects;
create policy homepage_media_public_read on storage.objects
  for select to anon, authenticated using (bucket_id = 'homepage-media');

drop policy if exists homepage_media_admin_write on storage.objects;
create policy homepage_media_admin_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'homepage-media' and public.is_admin());

drop policy if exists homepage_media_admin_update on storage.objects;
create policy homepage_media_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'homepage-media' and public.is_admin());

drop policy if exists homepage_media_admin_delete on storage.objects;
create policy homepage_media_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'homepage-media' and public.is_admin());


-- One flat library. Sections reference rows BY ID, and alt/title live here, so
-- the same photograph cannot end up carrying two different captions in two
-- places.
--
-- storage_path holds EITHER a homepage-media bucket path OR a /public path —
-- imageUrl() already passes `/`-prefixed values straight through. That is how
-- the eleven existing /images/landing/*.jpg files below join the library
-- without moving a single file.
create table if not exists public.homepage_images (
  id             uuid primary key default gen_random_uuid(),
  storage_path   text not null unique,
  -- For screen readers and search. Never rendered as visible text.
  alt            text check (char_length(alt) <= 300),
  -- The visible caption. This is the "photo title" the photo grid renders under
  -- each shot, and what the owner types when uploading.
  title          text check (char_length(title) <= 120),
  -- Drives the amber "Sample photo" badge. Uploads set this false; the seeded
  -- stock imagery below is true, deliberately, so a stranger's bathroom cannot
  -- quietly ship under a heading promising our own photographs.
  is_placeholder boolean not null default false,
  -- Describes the shot that belongs here while the real one is missing.
  brief          text,
  created_at     timestamptz not null default now()
);

alter table public.homepage_images enable row level security;

-- The homepage is anonymous, so anon must be able to read the library it
-- renders from.
drop policy if exists homepage_images_public_read on public.homepage_images;
create policy homepage_images_public_read on public.homepage_images
  for select to anon, authenticated using (true);

drop policy if exists homepage_images_admin_all on public.homepage_images;
create policy homepage_images_admin_all on public.homepage_images
  for all to authenticated using (public.is_admin()) with check (public.is_admin());


-- How many sections reference an image, so the admin can warn before deleting
-- one that is in use.
--
-- A text scan rather than a typed jsonb query on purpose: every section has a
-- different content shape (imageId, landmarkImages[], photos[].imageId,
-- reviews[].imageId, tiles[].image) and a shape-aware version would need
-- updating every time a section gains an image field. At tens of rows the scan
-- costs nothing. It is a warning, not a constraint — jsonb references cannot be
-- foreign keys, so the RENDERER must skip an id it cannot resolve.
create or replace function public.homepage_image_usage(image_id uuid)
returns int
language sql
stable
security invoker
set search_path = ''
as $$
  select count(*)::int
  from public.homepage_sections
  where content::text like '%' || image_id::text || '%';
$$;

revoke execute on function public.homepage_image_usage(uuid) from public;
grant execute on function public.homepage_image_usage(uuid) to authenticated;


-- Fixed UUIDs so the section seeds further down can reference these rows.
insert into public.homepage_images (id, storage_path, alt, title, is_placeholder, brief) values
  ('11111111-1111-4111-8111-000000000001', '/images/landing/hero.jpg',
   'Baba Baidyanath Dham temple at sunrise in Deoghar, Jharkhand', null, true,
   'Temple shikhar at dawn, or your living room with a real family in it'),

  ('11111111-1111-4111-8111-000000000002', '/images/landing/host.jpg',
   'Owner of Kailasha Stays standing at the entrance of the guest house in Deoghar', null, true,
   'The owner at the property entrance, daylight, looking at camera. No suit, no studio.'),

  ('11111111-1111-4111-8111-000000000003', '/images/landing/bathroom.jpg',
   'Clean tiled bathroom with Western toilet and hot water geyser at Kailasha Stays Deoghar',
   'The bathroom, lights on', true,
   'The bathroom with the lights on — the single most important photo on the page'),

  ('11111111-1111-4111-8111-000000000004', '/images/landing/kitchen.jpg',
   'Induction hob and filtered drinking water provided in a Kailasha Stays apartment',
   'The induction hob and water', true,
   'The induction hob and the filtered water — show exactly what is provided, nothing more'),

  ('11111111-1111-4111-8111-000000000005', '/images/landing/utilities.jpg',
   'Overhead water tank and power backup inverter ensuring 24-hour water and electricity',
   'Water tank and inverter', true,
   'The overhead water tank and the inverter, together if possible'),

  ('11111111-1111-4111-8111-000000000006', '/images/landing/entrance.jpg',
   'Private apartment entrance with lock at Kailasha Stays',
   'Your own door, your own key', true,
   'The apartment''s own door with its lock'),

  ('11111111-1111-4111-8111-000000000007', '/images/landing/exterior.jpg',
   'Exterior of the Kailasha Stays guest house building in Deoghar with signage',
   'The building from the road', true,
   'The building from the road, with signage visible'),

  ('11111111-1111-4111-8111-000000000008', '/images/landing/car.jpg',
   'Clean rental car with driver available for temple visits and airport pickup in Deoghar',
   'The car, and the driver', true,
   'The actual car, with the actual driver'),

  -- The three landmark tiles. These name real, identifiable places, which makes
  -- them the one set here where a convincing stock photo is WORSE than none: the
  -- current landmark1 is a South Indian gopuram and Baidyanath Dham is not.
  ('11111111-1111-4111-8111-000000000009', '/images/landing/landmark1.jpg',
   'Baba Baidyanath Dham temple in Deoghar', null, true,
   'Baba Baidyanath Dham itself — the shikhar, from the approach the guest will walk'),

  ('11111111-1111-4111-8111-000000000010', '/images/landing/landmark2.jpg',
   'Satsang Ashram in Deoghar', null, true,
   'The second landmark in your Distances list, photographed from the street'),

  ('11111111-1111-4111-8111-000000000011', '/images/landing/landmark3.jpg',
   'Jasidih railway station platform', null, true,
   'The third landmark — for a station, the entrance with its name board')
on conflict (storage_path) do nothing;


-- =============================================================================
-- 2. Cross-section business facts
--
-- These live on the settings singleton rather than inside a section because
-- several sections quote the same number — the cancellation window appears in
-- the trust ribbon, the hero chips and the FAQ — and it must not be possible to
-- change it in one place and leave it stale in another.
--
-- Retires most of lib/landing-config.ts. What stays in that file: the
-- photography brief comments, map.propertySlug / maxPins / coordinateOverrides,
-- and propertyExtras.
-- =============================================================================

alter table public.site_settings
  -- Response and cancellation promises. Shown as commitments, so keep them true.
  add column if not exists reply_minutes    int  not null default 15
    check (reply_minutes > 0 and reply_minutes <= 1440),
  add column if not exists hours_start      text not null default '8am',
  add column if not exists hours_end        text not null default '9pm',
  -- The same window in 24-hour numbers, kept separate from the display strings
  -- so the sticky bar's "open now" pip is a comparison rather than a parse of
  -- "8am". The pip promises a response time, so it must never claim open while
  -- the owner is asleep.
  add column if not exists hours_start_hour int  not null default 8
    check (hours_start_hour between 0 and 23),
  add column if not exists hours_end_hour   int  not null default 21
    check (hours_end_hour between 0 and 23),
  add column if not exists cancel_days      int  not null default 7
    check (cancel_days >= 0 and cancel_days <= 90),
  add column if not exists advance_pct      int  not null default 25
    check (advance_pct between 0 and 100),
  -- Indicative local hotel room rate, for the savings calculator's comparison.
  add column if not exists hotel_room_rate  int  not null default 2500
    check (hotel_room_rate >= 0),
  -- Setting host_name is what unhides the Meet-your-host section. It is the
  -- page's strongest trust element and is currently hidden entirely.
  add column if not exists host_name        text check (char_length(host_name) <= 120),
  add column if not exists host_years       text check (char_length(host_years) <= 40),
  add column if not exists maps_url         text,
  add column if not exists instagram_url    text,
  add column if not exists facebook_url     text;


-- =============================================================================
-- 3. Reordering and pinning
--
-- `locked` was one flag doing two jobs. It is replaced by two, and LEFT IN
-- PLACE UNUSED so the currently deployed admin page keeps working until the new
-- one ships. Drop it in a follow-up migration once nothing reads it.
-- =============================================================================

alter table public.homepage_sections
  -- False only for `homes`: it is where the hero's primary button points, so a
  -- hidden Homes section breaks the page's main path.
  add column if not exists can_hide boolean not null default true,
  -- 'first' | 'last' | null. A pinned section cannot be dragged out of its slot
  -- and nothing can be dragged past it. Everything else reorders freely.
  add column if not exists pin text check (pin in ('first', 'last'));

-- At most one section pinned to each end.
create unique index if not exists homepage_sections_pin_unique
  on public.homepage_sections (pin)
  where pin is not null;


-- =============================================================================
-- 4. Seed every builtin with the copy the page renders today
--
-- On conflict, content / can_hide / pin are refreshed but sort_order is NOT —
-- re-running must never scramble the owner's arrangement.
-- =============================================================================

insert into public.homepage_sections (key, kind, type, title, can_hide, pin, sort_order, content) values

-- ── Hero ────────────────────────────────────────────────────────────────────
-- `variants` are the ?src= ad landing variants, previously hardcoded in
-- heroCopy(). `src` must stay one of shravan|aiims|weekend; the brand default is
-- this section's own heading/lede. Keep the existing rule that an ad visitor's
-- headline is never replaced by the generic one — message match is the entire
-- point of the variant.
--
-- `chips` are the fixed reassurances. The leading proof chip (rating, or
-- families hosted) stays data-driven from the proof section's stats.
('hero', 'builtin', 'hero', 'Hero', true, 'first', 0, '{
  "eyebrow": "Deoghar · Jharkhand",
  "headingHi": "आपके परिवार के लिए देवघर में एक अपना घर",
  "heading": "A home of your own in Deoghar — {temple} from Baba Baidyanath Dham",
  "lede": "Whole apartments for families. The flat is yours alone, at a fixed price, written down. Airport pickup, car and pooja arranged before you arrive.",
  "ctaLabelHi": "घर देखिए",
  "ctaLabel": "View our homes",
  "imageId": "11111111-1111-4111-8111-000000000001",
  "chips": [
    { "label": "Verified host" },
    { "label": "Free cancellation" },
    { "label": "Replies in ~{replyMinutes} min" }
  ],
  "variants": [
    {
      "src": "shravan",
      "heading": "Shravani Mela {year} — a clean home for your family, {temple} from the temple",
      "lede": "Book early. We hold your flat with a small advance and we do not cancel on guests."
    },
    {
      "src": "aiims",
      "heading": "A full apartment near AIIMS Deoghar — quiet, clean, private",
      "lede": "Weekly and monthly rates for patients and attendants. An induction hob for tea and simple food. Quiet, clean, ground floor available."
    },
    {
      "src": "weekend",
      "heading": "A whole apartment in Deoghar for your family weekend",
      "lede": "Temple, Trikut, Tapovan and Basukinath — car and driver arranged. Fixed prices, no surprises."
    }
  ]
}'::jsonb),

-- ── Trust ribbon ────────────────────────────────────────────────────────────
('trust_ribbon', 'builtin', 'trust_ribbon', 'Trust ribbon', true, null, 10, '{
  "items": [
    { "icon": "check", "label": "Run by a Deoghar family" },
    { "icon": "check", "label": "Identity-verified host" },
    { "icon": "check", "label": "Free cancellation up to {cancelDays} days" },
    { "icon": "check", "label": "No hidden charges" }
  ]
}'::jsonb),

-- ── Where you'll be ─────────────────────────────────────────────────────────
-- landmarkImages is POSITIONAL against the property's Distances rows: index 0 is
-- the first row. Reorder those rows and the photos stay where they are, so the
-- editor must say so.
('map', 'builtin', 'map', 'Where you''ll be', true, null, 20, '{
  "heading": "Where you''ll be",
  "sub": "every distance below measured from our door",
  "landmarkImages": [
    "11111111-1111-4111-8111-000000000009",
    "11111111-1111-4111-8111-000000000010",
    "11111111-1111-4111-8111-000000000011"
  ]
}'::jsonb),

-- ── Our homes ───────────────────────────────────────────────────────────────
-- can_hide false: the hero's primary button points here.
('homes', 'builtin', 'homes', 'Our homes', false, null, 30, '{
  "eyebrowHi": "हमारे घर",
  "eyebrow": "Our homes",
  "heading": "{count} {homes}. Each one yours alone.",
  "lede": "A whole apartment to yourselves, sleeping {sleepsRange} : not a hotel room, and not shared with anyone."
}'::jsonb),

-- ── Why a 2BHK + calculator ─────────────────────────────────────────────────
('why_apartment', 'builtin', 'why_apartment', 'Why a 2BHK + price calculator', true, null, 40, '{
  "heading": "Why a 2BHK apartment is better than three hotel rooms",
  "body": "Six people in a hotel means three rooms, three bills and three sets of keys. Here it''s one flat, one price, and nobody sleeping in a corridor away from their family. It usually costs less, too. Don''t take our word for it — put your own numbers in."
}'::jsonb),

-- ── Meet your host ──────────────────────────────────────────────────────────
-- The years sentence is its OWN paragraph on purpose. The token emptiness rule
-- is applied per paragraph for multi-paragraph fields, so an unset host_years
-- drops that one sentence instead of blanking the whole biography.
('meet_host', 'builtin', 'meet_host', 'Meet your host', true, null, 50, '{
  "eyebrowHi": "आपका मेज़बान",
  "eyebrow": "Your host",
  "heading": "Namaste, I''m {hostName}.",
  "body": "I live in Deoghar.\n\nMy family has been here {hostYears} years.\n\nWhen my own relatives come for darshan, they stay in these flats. That is exactly why I keep them the way I do.\n\nIf anything is wrong, at any hour, you call me directly. Not a front desk. Me.",
  "imageId": "11111111-1111-4111-8111-000000000002",
  "videoCallTitle": "Want to see a flat before you decide?",
  "videoCallBody": "Ask me for a video call on WhatsApp. I''ll walk you through the whole apartment, live — the bathroom, the kitchen, the water tank, everything. No booking needed.",
  "videoCallCta": "Ask for a video walkthrough"
}'::jsonb),

-- ── Nothing hidden ──────────────────────────────────────────────────────────
-- photos is unbounded here, but the page has a 16-image budget (see §6 of the
-- plan). The editor should WARN past the budget rather than block.
('nothing_hidden', 'builtin', 'nothing_hidden', 'Nothing hidden (photo grid)', true, null, 60, '{
  "heading": "We photograph the parts other listings don''t.",
  "lede": "The bathroom. The water tank. Exactly what''s on the counter. Look properly before you book: what you see is what you get.",
  "photos": [
    { "imageId": "11111111-1111-4111-8111-000000000003" },
    { "imageId": "11111111-1111-4111-8111-000000000004" },
    { "imageId": "11111111-1111-4111-8111-000000000005" },
    { "imageId": "11111111-1111-4111-8111-000000000006" },
    { "imageId": "11111111-1111-4111-8111-000000000007" },
    { "imageId": "11111111-1111-4111-8111-000000000008" }
  ],
  "footNote": "Full photo sets are on each home''s page."
}'::jsonb),

-- ── Reviews and proof ───────────────────────────────────────────────────────
-- Stats stay null and reviews stay empty: NEVER seed invented proof. The
-- section keeps its existing honesty behaviour — hide the numeric rating under
-- 10 reviews, drop empty rungs, render nothing at all rather than something
-- hollow. The editor must not offer a default rating.
--
-- carousel.speedSeconds is one full loop. Auto-scroll must be disabled outright
-- under prefers-reduced-motion, and paused on hover AND focus-within.
('proof', 'builtin', 'proof', 'Reviews and proof', true, null, 70, '{
  "heading": "What families tell us afterwards.",
  "stats": {
    "googleRating": null,
    "googleCount": 0,
    "googleReviewUrl": "",
    "mmtRating": null,
    "familiesHosted": null,
    "yearStarted": "",
    "repeatPct": null
  },
  "reviews": [],
  "carousel": { "enabled": true, "speedSeconds": 40, "pauseOnHover": true }
}'::jsonb),

-- ── Add-on services ─────────────────────────────────────────────────────────
-- The add-ons themselves come from the add-on catalogue; only this line is copy.
('services', 'builtin', 'services', 'Add-on services', true, null, 80, '{
  "note": "All arranged on the same WhatsApp thread as your stay."
}'::jsonb),

-- ── Shravan notice ──────────────────────────────────────────────────────────
-- freeUnits is real-numbers-only and carries its own update date. Null hides the
-- availability pill entirely. Never guess it — faking scarcity would destroy the
-- only asset this page is building.
('shravan', 'builtin', 'shravan', 'Shravan notice', true, null, 90, '{
  "eyebrow": "Shravan · July–August",
  "heading": "Shravani Mela — please book early.",
  "body": "Deoghar receives over 40 lakh devotees through Shravan. Our homes are usually full months ahead.",
  "promise": "Reserve with {advancePct}% advance, pay the balance on arrival. Your written confirmation will be honoured. We do not cancel on guests, at any price.",
  "ctaLabel": "See which homes are free",
  "freeUnits": null,
  "lastUpdated": null
}'::jsonb),

-- ── FAQ ─────────────────────────────────────────────────────────────────────
-- Order matters: the first three are the highest-frequency objections in this
-- market — advance-payment risk, price changing after booking, and whether
-- elderly parents will cope.
--
-- The item flagged "comparison": true renders the comparison table beneath its
-- answer. The Kailasha column is emphasised, but the dharamshala genuinely wins
-- on price and the table says so — visible fairness converts better with this
-- buyer than a rigged comparison, and honesty about a weakness is precisely the
-- thing being sold. Do not let the editor "fix" that row.
--
-- The {templeLabel} / {templeDistance} item drops itself when no anchor
-- landmark is set, via the token emptiness rule.
('faq', 'builtin', 'faq', 'FAQ', true, null, 100, '{
  "heading": "The things families actually ask us",
  "items": [
    {
      "q": "What if I pay the advance and something goes wrong?",
      "a": "Video call first if you want, and free cancellation up to {cancelDays} days before check-in with a full refund. Only {advancePct}% upfront, balance on arrival."
    },
    {
      "q": "Will the price change after I book?",
      "a": "No. The rate we send you in writing is the rate you pay. Festival dates cost more and we tell you that upfront."
    },
    {
      "q": "Is it suitable for elderly parents?",
      "a": "Ground-floor option available, Western toilet with grab bar, hot water 24×7, car parks at the door. Tell us their needs when booking."
    },
    {
      "q": "How does this compare to a hotel or a dharamshala?",
      "a": "A dharamshala is the cheapest option and we won''t pretend otherwise. What you get here instead is the whole flat for your family, private bathrooms, a price fixed in writing, and a booking we will not cancel during Shravan.",
      "comparison": true
    },
    {
      "q": "How far is it from {templeLabel}?",
      "a": "{templeDistance}. We can drop you."
    },
    {
      "q": "Do you arrange airport or station pickup?",
      "a": "Yes. The price is fixed and told to you in advance — no haggling with a driver when you arrive."
    },
    {
      "q": "Can we cook our own food?",
      "a": "Not a full kitchen — we don''t want to promise one we don''t have. There is an induction hob for the basics: tea, coffee, warming milk or baby food. Filtered drinking water is provided, and it''s a pure vegetarian building. For full meals we can point you to places nearby, or arrange home-cooked food."
    },
    {
      "q": "Can you help arrange pooja at Baidyanath Dham?",
      "a": "Yes — plus guidance on Shringar Puja timings and what samagri to carry."
    },
    {
      "q": "Is there 24-hour water and electricity?",
      "a": "Yes. Overhead tank plus inverter backup. Both are photographed in the gallery above."
    },
    {
      "q": "How many people fit in one 2BHK?",
      "a": "Comfortably {sleepsMax}. Up to two extra mattresses at no charge."
    },
    {
      "q": "Is a car available for Basukinath and Trikut?",
      "a": "Yes, for a full day with driver. The rate is fixed and told to you before you book."
    }
  ],
  "comparisonRows": [
    { "label": "Whole family in one unit", "us": "Yes", "hotel": "No — 2–3 rooms", "dharamshala": "Shared" },
    { "label": "Induction hob for tea / baby food", "us": "Yes", "hotel": "No", "dharamshala": "Rarely" },
    { "label": "Private bathroom per family", "us": "Yes — 2", "hotel": "Yes", "dharamshala": "Usually shared" },
    { "label": "Price fixed in writing beforehand", "us": "Yes", "hotel": "Varies", "dharamshala": "Varies" },
    { "label": "Pickup & car arranged", "us": "Yes", "hotel": "Sometimes", "dharamshala": "No" },
    { "label": "Pooja assistance", "us": "Yes", "hotel": "No", "dharamshala": "Yes" },
    { "label": "Booking honoured in Shravan", "us": "Guaranteed", "hotel": "Often not", "dharamshala": "First-come" },
    { "label": "AC, hot water, power backup", "us": "Yes", "hotel": "Varies", "dharamshala": "Rarely" },
    { "label": "Cost for 6 people, 3 nights", "us": "Mid", "hotel": "Highest", "dharamshala": "Cheapest" }
  ],
  "closingLine": "Still have a question? Just ask — we don''t mind."
}'::jsonb),

-- ── Closing CTA ─────────────────────────────────────────────────────────────
('close', 'builtin', 'close', 'Closing CTA', true, 'last', 110, '{
  "headingHi": "अपना घर चुनिए।",
  "heading": "Pick your home. We''ll do the rest.",
  "body": "Every home has its own page with full photos, exact price and a direct WhatsApp line to us.",
  "ctaLabel": "See our homes",
  "shareHeadingHi": "परिवार से पूछना है?",
  "shareBody": "Send this page to your family group — they can see everything you just saw."
}'::jsonb)

on conflict (key) do update set
  content  = excluded.content,
  can_hide = excluded.can_hide,
  pin      = excluded.pin,
  title    = excluded.title;
  -- sort_order deliberately omitted: a re-run must not scramble the arrangement.
