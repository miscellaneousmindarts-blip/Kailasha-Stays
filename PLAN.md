# BnB Website — Full Build Plan

A direct-booking website + admin CMS + guest portal for a small Airbnb/homestay business (a few apartments, Vrindavan area). This document is the single source of truth for the build. Follow phases in order; each phase has acceptance checks.

---

## 1. Architecture & Stack

| Layer | Choice |
|---|---|
| Frontend + server | **Next.js 15 (App Router, TypeScript)** deployed on **Vercel** |
| Styling | Tailwind CSS (+ shadcn/ui for admin forms/tables/dialogs) |
| Database / Auth / Storage / Functions | **Supabase** (Postgres, Auth, Storage, Edge Functions, pg_cron) |
| Calendar sync | iCal import (pg_cron → Edge Function) + iCal export (Next.js route) |
| Guest contact | WhatsApp deep links (`https://wa.me/<OWNER_PHONE>?text=...`) — no payment gateway |

Key principles:

- **Public site** is server-rendered (SEO for property pages), reads only `published` data via the Supabase anon key + RLS.
- **Admin panel** lives at `/admin`, protected by Supabase Auth. No link to it anywhere on the public site; `noindex` + robots disallow. Login page exists only at `/admin/login` (reachable by URL only).
- **Guest portal** lives at `/stay/[token]` — an unguessable token per confirmed booking, no login. Data is fetched via a `SECURITY DEFINER` Postgres RPC that takes the token, so RLS never has to trust the anon role for booking data.
- All writes from the public site go through narrow paths: enquiry insert (anon RLS insert-only) and token-validated RPCs/Edge Functions for the guest portal.

Repo layout (single Next.js app):

```
/app
  /(public)
    page.tsx                    # homepage (placeholder for now — designed later)
    properties/page.tsx
    properties/[slug]/page.tsx
    stay/[token]/page.tsx
  /admin
    login/page.tsx
    layout.tsx                  # auth guard + admin nav
    page.tsx                    # dashboard
    listings/...  calendar/...  enquiries/...  bookings/...  addons/...  settings/...
  /api
    ical/[propertyId]/route.ts  # iCal EXPORT feed
/lib          # supabase clients, availability logic, ical builder, whatsapp message builder
/lib/blocks.ts                      # BLOCK_TYPES registry: zod schema + label + icon per block type
/components
  /blocks                           # one renderer per block type + SectionRenderer switch
  /admin/block-editors              # one editor per block type
/supabase
  /migrations                   # SQL files below
  /functions
    sync-calendars/             # Edge Function: iCal IMPORT
    guest-upload/               # Edge Function: token-validated ID upload
```

Environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server-only (API routes, never exposed)
NEXT_PUBLIC_OWNER_WHATSAPP=91XXXXXXXXXX
ICAL_EXPORT_SECRET=               # random string appended to export feed URLs
NEXT_PUBLIC_SITE_URL=https://<domain>
```

---

## 2. Database Schema (Supabase migration SQL)

Run as one migration. UUID PKs via `gen_random_uuid()`.

```sql
-- ===== admins =====
create table admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);
-- helper used by every admin RLS policy
create function is_admin() returns boolean language sql stable security definer as
$$ select exists (select 1 from admin_users where user_id = auth.uid()) $$;

-- ===== properties =====
create table properties (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  summary text,                      -- short card text
  description text,                  -- long, markdown allowed
  property_type text default 'Apartment',
  max_guests int default 2, bedrooms int default 1, beds int default 1, bathrooms numeric default 1,
  base_price numeric,                -- per night, display only
  currency text default 'INR',
  amenities text[] default '{}',     -- values from the fixed catalog in /lib/amenities.ts
  house_rules text,
  check_in_time text default '13:00', check_out_time text default '11:00',
  address_line text, area text, city text default 'Vrindavan', state text default 'Uttar Pradesh',
  lat numeric, lng numeric, gmaps_url text,        -- public map link (approximate area ok)
  airbnb_url text, booking_com_url text,
  sort_order int default 0,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

-- private per-property info shown ONLY in guest portal / admin
create table property_private (
  property_id uuid primary key references properties(id) on delete cascade,
  exact_address text, exact_gmaps_url text, directions_note text,
  wifi_name text, wifi_password text, door_code text, other_notes text
);

create table property_contacts (      -- caretaker, electrician, owner, etc.
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  name text not null, role text, phone text not null,
  show_to_guest boolean default true, sort_order int default 0
);

create table property_images (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  storage_path text not null,        -- path in 'property-images' bucket
  alt text, is_cover boolean default false, sort_order int default 0
);

-- ===== flexible content sections (admin page-builder) =====
-- Core structured fields (title, capacity, price, amenities, location, links) stay as
-- fixed columns because the booking card, listing cards, availability and SEO depend on
-- them. EVERYTHING else on the property page is admin-composed sections:
create table property_sections (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  title text,                        -- section heading, optional
  type text not null,                -- see block catalog below; validated in app code,
                                     -- NOT a DB check constraint (so new types need no migration)
  content jsonb not null default '{}'::jsonb,
  audience text not null default 'public' check (audience in ('public','guest','both')),
  visible boolean not null default true,
  sort_order int not null default 0
);
create index on property_sections (property_id, sort_order);
```

**Block catalog** (v1) — each `type` has a fixed `content` shape, one renderer component, one editor component:

| type | content jsonb shape | renders as |
|---|---|---|
| `paragraph` | `{ text }` (markdown) | prose block |
| `list` | `{ style: 'bullet'\|'check'\|'number', items: [string] }` | styled list (check = Lucide check icons) |
| `image` | `{ storage_path, alt, caption? }` | full-width rounded image + caption |
| `gallery` | `{ images: [{storage_path, alt}] }` | 2–3 col grid, lightbox |
| `link_list` | `{ links: [{label, url, note?}] }` | link cards with external-link icon |
| `key_value` | `{ rows: [{label, value}] }` | two-column facts table (e.g. "Banke Bihari Mandir — 500 m") |
| `faq` | `{ items: [{q, a}] }` | accordion |

Extending later = add one entry to `BLOCK_TYPES` in `/lib/blocks.ts` (zod schema for its content) + a renderer in `/components/blocks/` + an editor in `/components/admin/block-editors/`. No DB migration needed. Unknown types render nothing on the public site (never crash) and show "unsupported block" in admin.

```sql

-- ===== add-on services (car rental, mandir pooja, ...) =====
create table addon_services (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,  -- NULL = available for all properties
  name text not null, description text,
  price numeric, price_unit text default 'per booking',  -- 'per day', 'per person', ...
  active boolean default true, sort_order int default 0
);

-- ===== enquiries (from Book Direct form) =====
create table enquiries (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id),
  name text not null, phone text not null,
  check_in date not null, check_out date not null,
  guests int default 2,
  addon_ids uuid[] default '{}',     -- addons ticked in the form
  message text,
  status text not null default 'new' check (status in ('new','contacted','converted','closed')),
  created_at timestamptz default now()
);

-- ===== bookings =====
create table bookings (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id),
  enquiry_id uuid references enquiries(id),
  source text not null default 'direct' check (source in ('direct','airbnb','booking_com','other','blocked')),
  guest_name text, phone text, guests int,
  check_in date not null, check_out date not null,
  status text not null default 'confirmed' check (status in ('confirmed','cancelled','completed')),
  total_amount numeric default 0, currency text default 'INR',
  portal_token text unique,          -- nanoid(12), generated when admin confirms a direct booking
  token_expires_at timestamptz,      -- default: check_out + 7 days
  notes text,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create index on bookings (property_id, check_in, check_out);

create table booking_addons (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  addon_service_id uuid references addon_services(id),
  name text not null, price numeric default 0, qty int default 1,
  status text not null default 'requested' check (status in ('requested','confirmed','cancelled'))
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  amount numeric not null,           -- positive = paid by guest
  method text, note text, paid_at date default current_date,
  created_at timestamptz default now()
);
-- billing: total_due = bookings.total_amount + sum(confirmed booking_addons price*qty); paid = sum(payments); due = total_due - paid

create table guest_documents (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  guest_name text, doc_type text default 'govt_id',
  storage_path text not null,        -- path in private 'guest-docs' bucket
  uploaded_at timestamptz default now()
);

-- ===== calendar sync =====
create table calendar_sources (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  platform text not null check (platform in ('airbnb','booking_com','other')),
  ical_url text not null,
  last_synced_at timestamptz, last_status text, last_error text
);

create table external_events (       -- events pulled from Airbnb/Booking.com iCal feeds
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  source_id uuid not null references calendar_sources(id) on delete cascade,
  uid text not null,                 -- iCal UID
  start_date date not null, end_date date not null,   -- end exclusive, iCal convention
  summary text, synced_at timestamptz default now(),
  unique (source_id, uid)
);
create index on external_events (property_id, start_date, end_date);
```

### RLS (enable on every table)

| Table | anon (public site) | admin (`is_admin()`) |
|---|---|---|
| properties, property_images, addon_services, property_contacts | `select` where property `status='published'` (addons: `active=true`; contacts: **no anon access** — guest portal gets them via RPC) | all |
| property_sections | `select` where property `status='published'` and `visible=true` and `audience in ('public','both')` (guest-only sections come via the portal RPC) | all |
| property_private, calendar_sources, external_events, bookings, booking_addons, payments, guest_documents, enquiries | none | all |
| enquiries | `insert` only (anyone can submit the form) | all |
| admin_users | none | select own row |

Guest portal never queries tables directly — see the RPC below.

### RPCs (SECURITY DEFINER)

```sql
-- 1) Availability for the public date picker (only dates, no guest data leaks)
create function get_unavailable_dates(p_property_id uuid)
returns table (start_date date, end_date date) language sql stable security definer as $$
  select check_in, check_out from bookings
    where property_id = p_property_id and status = 'confirmed' and check_out >= current_date
  union all
  select start_date, end_date from external_events
    where property_id = p_property_id and end_date >= current_date
$$;

-- 2) Guest portal bundle: everything the /stay/[token] page needs, in one call
create function get_booking_by_token(p_token text) returns jsonb ...
-- Returns NULL if token not found, booking cancelled, or token_expires_at < now().
-- Otherwise returns jsonb: { booking: {...}, property: {title, images, check-in/out times},
--   private: {exact_address, exact_gmaps_url, wifi_name, wifi_password, directions_note},
--   contacts: [ ...where show_to_guest... ], addons_available: [...], addons_booked: [...],
--   billing: { total, addons_total, paid, due, payments: [...] },
--   sections: [ ...property_sections where visible and audience in ('guest','both')... ],
--   documents: [ {guest_name, doc_type, uploaded_at} ] }   -- names only, never file URLs

-- 3) Guest requests an add-on from the portal
create function request_addon(p_token text, p_addon_id uuid, p_qty int) returns void ...
-- Validates token, inserts booking_addons with status='requested'.
```

### Storage buckets

- `property-images` — **public** bucket. Admin uploads via authenticated client (storage RLS: write only for `is_admin()`).
- `guest-docs` — **private** bucket. Uploads only through the `guest-upload` Edge Function (validates portal token, uses service role, path `bookingId/filename`, max 5 MB, jpg/png/pdf only). Admin views files via short-lived signed URLs generated server-side.

---

## 3. Public Site

### `/properties` — listing page
Grid of published properties: cover image, title, area/city, guests · bedrooms · baths, from-price, amenity icons (top 4), → detail page. Server component, ISR (`revalidate: 300`).

### `/properties/[slug]` — property detail (Airbnb-like)
Sections top to bottom:
1. **Photo gallery** — cover + grid, lightbox on click.
2. **Title row** — title, area/city, type · guests · bedrooms · beds · baths.
3. **Description** (markdown), **Amenities** grid (SVG icons from Lucide, fixed catalog in `/lib/amenities.ts` — never emoji).
4. **Custom sections** — all `property_sections` with `audience in ('public','both')`, rendered in `sort_order` by the block renderer (`<SectionRenderer />` switching on `type`). This is where the admin composes anything beyond the fixed fields: "Things to do nearby" (key_value), "What this place offers in detail" (list), "Local food guide" (link_list), FAQs, extra galleries, etc.
5. **Availability calendar** — 2-month view, blocked dates greyed out (from `get_unavailable_dates` RPC). Check-out day of an existing booking is selectable as a new check-in (nights-based logic: a date is "blocked" if the *night* starting that date is taken).
6. **Location** — embedded Google Map iframe using `gmaps_url`/lat-lng (approximate area on public page; exact pin only in guest portal).
7. **House rules**, check-in/out times.
8. **Sticky booking card** (desktop right column / mobile bottom bar):
   - Date range picker (blocked dates disabled) + guests.
   - **“Book Direct”** (primary) → opens booking dialog.
   - **“Book on Airbnb”** (secondary) → `airbnb_url`, new tab. Show Booking.com button too if `booking_com_url` set.

### Book Direct flow
Dialog/drawer with: name*, phone* (10-digit India validation), dates (prefilled from picker), guests, add-on checkboxes (active addons for this property + global ones), optional message.

On submit:
1. Insert row into `enquiries` (anon insert).
2. Open WhatsApp deep link with prefilled message:

```
Namaste! I'd like to book *{property.title}*.
Check-in: {check_in, e.g. Sat, 2 Aug 2026}
Check-out: {check_out}
Guests: {n}
Add-ons: {names or "None"}
Name: {name}
Enquiry ID: {short id}
```

`https://wa.me/${NEXT_PUBLIC_OWNER_WHATSAPP}?text=${encodeURIComponent(msg)}`

3. Show confirmation state: “Your enquiry is sent — we'll confirm on WhatsApp shortly.” (Enquiry is saved even if they don't complete the WhatsApp step.)

### SEO / robots
- Per-property `generateMetadata` (title, description, OG image from cover photo).
- `robots.txt`: disallow `/admin`, `/stay`, `/api`. `X-Robots-Tag: noindex` on those routes via middleware. Sitemap of public pages.

---

## 4. Calendar Sync (Airbnb + Booking.com)

Both platforms speak **iCal** — this is the only integration small hosts get, and it's one-way in each direction with platform-side lag (Airbnb refreshes imports roughly hourly-to-few-hours; Booking.com similar). The plan:

### Import (their bookings → our DB)
- Admin pastes each listing's iCal export URL (from Airbnb: *Calendar → Availability → Connect another website*; Booking.com: *Rates & Availability → Sync calendars*) into **Admin → Settings → Calendar sources**.
- **Edge Function `sync-calendars`**: for every `calendar_sources` row — fetch the .ics, parse VEVENTs (DTSTART/DTEND/UID/SUMMARY; use a small parser, e.g. `node-ical` for Deno or hand-rolled ~40-line parser — the feeds are simple all-day events), then upsert into `external_events` on `(source_id, uid)` and **delete events whose UID no longer appears** in the feed (that's how cancellations propagate). Update `last_synced_at/last_status/last_error`.
- **Schedule**: `pg_cron` + `pg_net` calls the Edge Function every 30 min. (One SQL statement in a migration; store the function URL + service key in Vault or hardcode the cron SQL at setup.)
- **Manual “Sync now”** button in admin calls the same function.

### Export (our direct bookings → their calendars)
- Route `/api/ical/[propertyId]/route.ts?key=ICAL_EXPORT_SECRET` returns `text/calendar` with one VEVENT per confirmed **direct** booking (and manual blocks). UID = booking id.
- Admin copies this URL into Airbnb's and Booking.com's "import calendar". Result: a direct booking blocks those platforms automatically.
- Admin → Settings shows the copyable export URL per property.

### Conflict safety
Direct bookings are confirmed manually by the admin (from an enquiry), so before saving, the admin booking form re-checks overlap against `bookings` + `external_events` and warns loudly on conflict. Mention the sync lag in the UI (“Airbnb may take up to a few hours to see this block”).

---

## 5. Admin Panel (`/admin`)

- **Auth**: Supabase email/password. Create the admin user manually in Supabase dashboard, insert into `admin_users`. `/admin/login` is the only entry point (no public links). Next.js middleware: no session → redirect to login; session but not in `admin_users` → 404.
- Layout: sidebar nav (desktop) / top bar (mobile).

### Sections

1. **Dashboard** (`/admin`)
   - **Upcoming alerts**: check-ins and check-outs in the next 7 days (all sources), each with property, guest, dates, source badge.
   - New enquiries count + latest 5.
   - Sync health: any `calendar_sources` with errors or `last_synced_at` older than 2 h → warning banner.
   - Flags: direct bookings with missing guest IDs (< X days to check-in), bookings with due balance.

2. **Listings** (`/admin/listings`)
   - Table of all properties (status badge, cover thumb). Create/Edit form in tabs: *Basics* (title, slug auto-from-title, type, capacity, price), *Description & amenities* (checkbox catalog), *Photos* (multi-upload to `property-images`, drag to reorder, set cover), **Sections** (page builder — below), *Location* (public approx + private exact in `property_private`), *Links* (airbnb_url, booking_com_url), *Private info* (wifi, door code, directions), *Contacts* (CRUD rows, `show_to_guest` toggle), *House rules & times*. Publish/unpublish toggle; delete with confirmation dialog (typed confirmation).
   - **Sections tab (page builder)**: vertical list of section cards, each showing drag handle, type icon, title, audience badge (Public / Guest / Both), visibility toggle, edit + delete. "Add section" opens a picker grid of block types (icon + name + one-line example for each). Picking a type opens its dedicated editor in a sheet: paragraph → markdown textarea; list → style select + reorderable items; image/gallery → upload with alt/caption fields; link_list → label/URL/note rows; key_value → label/value rows; faq → question/answer rows. Save writes the validated jsonb (zod). Drag-reorder persists `sort_order`. A **Preview** button opens the live property page in a new tab (drafts previewable by admins via `?preview=1` — admin session bypasses the `published` filter for their own preview only).

3. **Calendar** (`/admin/calendar`)
   - Property switcher tabs + month grid (build with `react-big-calendar` or a simple custom month grid — custom is fine, month view only).
   - Events color-coded by source: **direct** (green), **airbnb** (red/rausch), **booking_com** (blue), **blocked** (grey). Legend shown.
   - Click a day → “Add manual block” (creates a `bookings` row with `source='blocked'`). Click an event → detail popover (guest, dates, source; direct → link to booking page).

4. **Enquiries** (`/admin/enquiries`)
   - Table: newest first, status filter chips. Row → detail drawer: all fields + WhatsApp deep-link button to reply.
   - **“Convert to booking”** → booking form prefilled from enquiry (property, name, phone, dates, requested addons as `requested` rows). On save: enquiry → `converted`; booking created with `portal_token = nanoid(12)`, `token_expires_at = check_out + 7 days`.
   - Statuses: new / contacted / converted / closed.

5. **Bookings** (`/admin/bookings`)
   - Filterable list (upcoming / past / cancelled, per property, per source).
   - Detail page: guest info, dates, source; **addons** (confirm/cancel requested ones, add manually, set price); **billing** — total_amount field, payments table (add payment: amount/method/date/note), computed *Paid* and *Due*; **guest documents** — list with signed-URL preview links, count vs `guests`; **portal link** — copy button + “Send on WhatsApp” deep link with prefilled message:
     ```
     Namaste {name}! Your booking at {property} is confirmed 🎉
     {check_in} → {check_out}
     Everything you need (location, wifi, contacts): {SITE_URL}/stay/{token}
     ```
   - Regenerate token button (invalidates old link). Cancel booking (confirmation required; frees dates).

6. **Add-ons** (`/admin/addons`) — CRUD for services, global or per-property, active toggle.

7. **Settings** (`/admin/settings`) — calendar sources CRUD per property (paste iCal URLs, platform select, last-sync status, Sync now), export-URL display per property, owner WhatsApp number.

---

## 6. Guest Portal (`/stay/[token]`)

Server component; calls `get_booking_by_token`. Invalid/expired → friendly “link expired, contact us” page (with owner WhatsApp link). Valid → mobile-first page, sections:

1. **Header** — property photo, “Your stay at {title}”, guest name, dates, nights, guests.
2. **Getting there** — exact address, **exact** Google Maps link, directions note, check-in/out times.
3. **Wifi & access** — wifi name/password (tap-to-copy), door code if any.
4. **Important contacts** — caretaker etc. (`show_to_guest=true`), tap-to-call + WhatsApp buttons.
5. **Add-on services** — booked addons with status; available addons with “Request” button → `request_addon` RPC → shows as *Requested*, admin confirms. (Optionally also opens a WhatsApp prefill.)
6. **Billing** — total, addons, paid, **due** highlighted; payments list.
7. **Good to know** — property_sections with `audience in ('guest','both')`, rendered with the same block renderer as the public page (this is where the admin puts appliance instructions, nearby food, temple timings, etc.).
8. **Guest details & ID upload** — banner: “Please upload a govt. ID for each guest (required by law)”. Progress `2 of 4 uploaded`. Form: guest name + file → `guest-upload` Edge Function (multipart: token, name, file). Uploaded list shows name + timestamp only (no re-download of the file — privacy).
9. **House rules** + footer with owner contact.

Security notes: token is 12-char nanoid (~71 bits); page sends `noindex`; no file URLs ever returned to the portal; rate-limit the upload function (per-token count cap, e.g. 15 files).

---

## 7. Build Phases (for the implementing model — do them in order)

**Phase 0 — Scaffold** ✅ *Acceptance: app boots locally, Supabase migration applied, seed script inserts 2 sample properties with images.*
- `create-next-app` (TS, Tailwind, App Router), shadcn/ui init, Supabase clients (`/lib/supabase/server.ts`, `client.ts`, middleware helper), migration SQL from §2, storage buckets, seed script, `.env.local.example`.

**Phase 1 — Public property pages** ✅ *Acceptance: /properties lists seeds; detail page renders gallery, amenities, map, rules AND seeded custom sections via the block renderer (seed at least one paragraph, list, key_value and faq section); SEO meta present; mobile layout clean; skeleton loading states in place.*

**Phase 2 — Availability + Book Direct** ✅ *Acceptance: blocked dates disabled in picker; submitting form creates enquiry row and opens correct wa.me URL; Airbnb button opens listing; dialog/sheet animations per §8.*

**Phase 3 — Admin auth + Listings CRUD + section builder** ✅ *Acceptance: /admin invisible/404 to non-admins; login works; can create/edit/publish/delete a property with photos; can add/edit/reorder/hide sections of every block type and see them on the public page; audience=guest sections do NOT appear publicly; changes appear on public site.*

**Phase 4 — Enquiries + Bookings + Calendar view** ✅ *Acceptance: enquiry appears in admin; convert-to-booking generates portal token; month calendar shows direct bookings + manual blocks color-coded; overlap warning fires.*

**Phase 5 — iCal sync** ✅ *Acceptance: pasting a real Airbnb iCal URL and pressing Sync now populates external_events and blocks dates publicly; export URL returns valid .ics (validate at icalendar.org); pg_cron job scheduled.*

**Phase 6 — Guest portal** ✅ *Acceptance: portal link from a booking shows all sections with real data; expired/invalid token shows fallback; addon request appears in admin.*

**Phase 7 — Billing, ID uploads, dashboard alerts, polish** ✅ *Acceptance: payments math correct (total+addons−paid=due) in both admin and portal; ID upload lands in private bucket and shows in admin with signed URL; dashboard shows 7-day check-ins/outs and sync warnings; robots/noindex verified; Lighthouse mobile ≥ 90 on property page.*

**Deferred (explicitly out of scope for now)**: homepage design (keep a minimal placeholder linking to /properties), online payments, reviews, multi-admin roles, email notifications, i18n.

---

## 8. Visual Design & UX

Target feel: **modern Airbnb** — airy, photo-first, confident whitespace, soft depth, everything smooth. The homepage comes later, but every functional page ships with this system from day one. All tokens live in Tailwind config / CSS variables — no raw hex in components.

### 8.1 Design tokens

- **Color** (semantic tokens, light theme for v1):
  - `surface` #FFFFFF, `surface-subtle` #F7F7F5 (section bands), `border` #EBEBE9
  - `text` slate-900 (#1A1A1A-ish), `text-muted` #6B7280 (only on white — keeps 4.5:1)
  - `primary` — one warm accent in the terracotta/saffron family (e.g. #C2410C range), used ONLY for primary CTAs, active states, and highlights. `primary-hover` one step darker. Everything else stays neutral — that restraint is what makes it feel like Airbnb, not a template.
  - Semantic: `success` green-600, `danger` red-600, `warning` amber-600 — always paired with an icon or label, never color alone.
- **Radius scale**: `sm` 8px (inputs, chips) · `md` 12px (buttons, cards) · `lg` 16px (images, dialogs) · `full` (pills, avatar). Photos always rounded-`lg`.
- **Elevation**: 3 levels only — `card` (0 1px 2px rgba(0,0,0,.06)), `raised` (0 6px 16px rgba(0,0,0,.12) — Airbnb-style, for booking card, popovers), `overlay` (0 8px 28px rgba(0,0,0,.28) — dialogs/sheets). Never ad-hoc shadows.
- **Spacing**: 4/8px rhythm; page gutters 24px mobile / 48px desktop; sections separated by 48–64px; `max-w-7xl` container, property detail content column `max-w-3xl` beside the booking card.
- **Typography**: single family — **Figtree** (or Plus Jakarta Sans) via `next/font`, hierarchy by weight not typeface: 600–700 headings, 500 labels/buttons, 400 body. Scale: 14 / 16 (body, never smaller for paragraphs) / 18 / 22 / 26 / 32. Line-height 1.6 body, 1.25 headings. Tabular figures for prices and billing tables.
- **Icons**: Lucide only, 1.5px stroke, sizes 16/20/24 as tokens. **Never emoji as icons.**

### 8.2 Motion (make it feel "seamless and smooth")

Global rules, enforced everywhere:
- Micro-interactions 150–250ms, `ease-out` on enter, `ease-in` ~150ms on exit (exits faster than enters). Only `transform` and `opacity` are animated — never width/height/top (no layout shift, CLS < 0.1).
- Pressables get feedback within 100ms: buttons/cards scale to 0.98 on press and restore on release; hover on desktop lifts cards `card → raised` with a 200ms shadow/opacity transition.
- **Dialogs/sheets**: booking dialog scales+fades from 0.96 (desktop); on mobile it's a bottom sheet sliding up with a drag-to-dismiss handle and a 45% black scrim (fade 200ms). Escape/scrim-tap/swipe-down all dismiss.
- **Page transitions**: use the View Transitions API (`next-view-transitions`) for a shared-element feel — the property card image morphs into the detail-page gallery. Progressive enhancement: if unsupported, instant navigation is fine.
- **Lists/grids**: property cards fade+rise 8px in, staggered 40ms per card, first paint only.
- **Skeletons, not spinners**: any load > 300ms shows a shimmer skeleton matching the final layout (cards grid, detail page, admin tables). Reserve image space with `aspect-ratio` so nothing jumps.
- `prefers-reduced-motion`: all of the above collapse to simple fades/instant.

### 8.3 Page-level UX

- **Header (public)**: sticky, white with subtle blur + hairline border appearing after 8px scroll; logo left, "Properties" + WhatsApp contact right. No login button anywhere.
- **Property cards**: full-bleed image (4:3, subtle 1.05 zoom on hover, 300ms), then title, area, "guests · bedrooms · baths" muted line, "from ₹X / night" with the number semibold. Entire card clickable, focus ring visible.
- **Detail page (Airbnb pattern)**: gallery = 1 large + 4 small grid on desktop ("Show all photos" pill bottom-right → full-screen lightbox with swipe, pinch-zoom, keyboard arrows, counter); horizontal swipe carousel with dots on mobile. Two-column body on desktop: content left, **sticky booking card** right (raised shadow, rounded-lg, price + rating-less clean layout, date fields opening the range picker, guest stepper, the two CTAs, and the reassurance line "No payment now — confirm on WhatsApp"). On mobile the card becomes a **sticky bottom bar** (safe-area padded): "₹X / night · dates" left, "Book Direct" button right.
- **Date picker**: 2 months side-by-side desktop / 1 month vertically scrollable mobile; blocked dates struck-through and non-tappable; selected range fills with `primary` at 10% tint, endpoints solid; min-stay = 1 night; tapping a blocked range shows a small "Those dates are taken" toast.
- **Booking dialog**: single screen, no wizard. Inline validation on blur (never per keystroke), errors under the field in `danger` with icon and how to fix. Submit button shows spinner + "Opening WhatsApp…", disabled during flight. Success state swaps dialog content to a big check (200ms crossfade), the WhatsApp button (in WhatsApp brand green, official glyph), and "We'll confirm shortly".
- **Guest portal**: card-per-section vertical stack, generous padding, tap-to-copy chips for wifi (copied → checkmark + toast), `tel:`/`wa.me` buttons ≥ 44px, due amount in a highlighted stat row, upload area with drag-drop + camera capture on mobile (`capture="environment"`), per-file progress bars.
- **Empty/error states everywhere**: no bare blank areas — icon + one sentence + one action (e.g. enquiries empty state: "No enquiries yet — share your properties page"). Failed loads get a retry button. Toasts: bottom center, 3–4s auto-dismiss, `aria-live="polite"`, never steal focus.

### 8.4 Admin design

Clean neutral workspace, distinct from the guest-facing warmth: white surfaces, slate text, shadcn/ui defaults with the same radius/shadow tokens, `primary` reserved for primary actions. Dense but breathable tables (56px rows), sticky table headers, filter chips. Calendar sources double-encoded (color + text label). Destructive actions always red + separated + confirm dialog. Section builder drag interactions must show a drop indicator line and animate reorder (~200ms FLIP). Fully usable on a phone — the owner will manage bookings from one: sidebar collapses to a bottom tab bar (Dashboard, Calendar, Bookings, Enquiries, More).

### 8.5 Accessibility & quality bar (pre-delivery checklist)

- Text contrast ≥ 4.5:1 (muted text included), focus rings visible on every interactive element, tab order = visual order.
- Touch targets ≥ 44×44px with ≥ 8px gaps (date-picker cells included).
- All images have alt (admin alt fields feed straight through); icon-only buttons have `aria-label`; lightbox and dialogs trap focus and restore it on close; heading levels sequential.
- Forms: visible labels (never placeholder-only), `inputmode`/`autocomplete` set (tel keyboard for phone), first invalid field auto-focused on failed submit.
- 16px+ body on mobile (prevents iOS zoom), no horizontal scroll at 320px, `min-h-dvh` not `100vh`.
- Lighthouse mobile ≥ 90 performance / ≥ 95 accessibility on /properties and a detail page before each phase is called done.
