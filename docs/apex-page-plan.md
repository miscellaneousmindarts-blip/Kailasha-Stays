# Apex page (`deogharbnb.space/`) — build plan & visual spec

**For implementation by Sonnet.** Source strategy: `deogharbnb-landing-page-strategy.md` (4 Aug 2026).
Written against commit `aeef64d`. Everything below was checked against the live codebase and
the live database, not assumed from the strategy doc.

---

## 0. Read this before designing anything

### 0.1 Supply: building for 6 homes across 3 hosts

Live today (queried with the **anon** key — what a logged-out visitor sees):

```
properties (status = published, all tenants) → 2 rows, both tenant d2f0c762
tenants → 2 (kailasha-stays, archana-homestay; the latter has 0 published)
```

**Confirmed incoming: 2 more hosts and 4 more properties.** So the target state is
**~6 homes across ~3 hosts**, which is exactly the floor the strategy doc names as viable:
*"six real, well-photographed, verified homes convert better than twenty thin listings."*

**Build for the marketplace framing.** "Our verified homes in Deoghar", plural, across hosts,
is true at 6 — and the whole point of the apex is that it aggregates what the subdomains
can't. Two consequences for how this gets built:

- **Every component takes `N` properties, never a hardcoded count.** The grid, the calculator
  options, the JSON-LD `ItemList` all iterate. Nothing assumes 2 or 6.
- **Layout must not break at either end.** Specced below for 2 (today), 6 (soon) and 12+
  (later) without a rebuild.

**On the search bar (doc §3):** ship **filter chips, not date search.** Chips filter the
on-page grid client-side and are honest and useful at 6 homes. A check-in/check-out search
implies live cross-property availability — that means querying every property's bookings and
`external_events`, plus a `/stays/` results page to land on. That is its own feature, not a
homepage widget. Deferred to Part B (B3).

### 0.2 Branding assets — platform logo + favicon, and the host fallback

You're supplying a Deoghar BnB logo and favicon. Two jobs, and the second one is the
more valuable:

**Job 1 — the apex uses them.** Header wordmark and browser tab.

**Job 2 — they become the default for any host who hasn't uploaded their own.** Today the
fallback is worse than it needs to be:

| Surface | Current fallback | Should become |
|---|---|---|
| `components/site-header.tsx:20` | `logo_path` → else **business-name text** | `logo_path` → **platform logo** → business-name text |
| Tenant favicon (`s/[tenant]/layout.tsx:45`) | `favicon_path` → else Next's `/app/favicon.ico` | `favicon_path` → **platform favicon** |
| Guest portal (`stay/[token]/layout.tsx`) | inherits the above | same |

A host who hasn't uploaded a logo currently gets bare text in the header; with this change
they get a real mark and the network reads as one product. **The host's own asset always
wins where it exists** — this is a fallback, never an override.

Assets go in `public/` (platform-owned, not a tenant's `homepage-media` bucket):

```
public/brand/deogharbnb-logo.svg        preferred — crisp at any size, themeable
public/brand/deogharbnb-logo.png        fallback if only raster is available (@2x, ~600px wide)
public/brand/deogharbnb-mark.svg        square mark for tight spaces / favicon source
app/icon.svg  (or favicon.ico)          the tab icon
```

**Ask:** SVG if at all possible, plus a square-format mark. A wide wordmark alone can't serve
the favicon or the mobile header. Note `app/favicon.ico` already exists and Next's file
convention takes priority over metadata `icons` — the existing root layout documents this
trap; replacing that file is the cleanest route for the platform default.

### 0.3 What is genuinely free

### 0.2 What is genuinely free

Cross-tenant reads **already work for anon** — no migration needed. The RLS policy from
`0013_public_read_anon_only.sql` is:

```sql
create policy properties_public_read on public.properties
  for select to anon using (status = 'published');   -- no tenant filter
```

Verified live: an anon key returns published properties from every tenant, plus `tenants`,
`site_settings`, `property_images` and `rate_periods`. So the apex can list the whole network
with a plain query, and host names come free from `site_settings.business_name`.

**One migration is needed** — for the Airbnb review counts on the grid cards (§S4). That is the
only schema change in this plan.

### 0.4 What I am NOT doing here

The doc's §0.3 recommends collapsing host subdomains into `deogharbnb.space/stays/…` with
`rel=canonical` from the subdomains. **That is out of scope for this page and should be a
separate, deliberate decision.** It changes which URL Google treats as authoritative for
properties that already rank, it touches every tenant's site, and getting it wrong de-indexes
live inventory. Note it, don't bundle it. See Part B.

---

## 1. Visual foundations — use these exactly

The apex must look like it belongs to the same company as `kailasha-stays.deogharbnb.space`,
because it does. Every value below already exists in `app/globals.css`. **Do not introduce new
colours, radii, shadows or easings.**

### 1.1 Type

| Role | Classes | Notes |
|---|---|---|
| Body / UI | default (`--font-sans`, Figtree) | 16px base, never below 14px on mobile |
| Display | `font-display` (Fraunces 600) | Landing surfaces only — never in admin |
| Eyebrow | `text-primary text-xs font-semibold tracking-[0.14em] uppercase` | use `<Eyebrow hi="…" en="…" />` |
| H1 Hindi | `text-[28px] leading-[1.35] font-normal md:text-[42px]` + `lang="hi"` | Devanagari renders heavier; 400 is correct |
| H1 English | `font-display text-[26px] leading-[1.1] font-semibold md:text-[42px]` | |
| H2 | `font-display text-[26px] leading-[1.15] font-semibold md:text-[34px]` | |
| H3 / card title | `font-display text-[19px] leading-snug font-semibold md:text-[22px]` | |
| Lede | `text-lg leading-relaxed text-text-muted` | |
| Fine print | `text-text-muted text-sm` | |

Inside an `Eyebrow`, the Hindi span gets `tracking-normal normal-case` — uppercase letter-spacing
mangles Devanagari. `<Eyebrow>` already handles this; use it rather than hand-rolling.

**Bilingual rule, inherited from the tenant site and non-negotiable for brand coherence:**
Hindi first for emotional weight, English second for clarity and SEO. Hindi is never a
translation of the English — it's the same message in its own register.

### 1.2 Colour & bands

Sections alternate using the existing `<Section band>` primitive. **Never two `sand` bands
adjacent, and exactly one `ink` band on the page.**

| Band | Token | Use for |
|---|---|---|
| `canvas` | `bg-background` #ffffff | default |
| `sand` | `bg-surface-subtle` #f7f7f5 | alternating relief |
| `ink` | `bg-foreground text-background` #1a1a1a | **host acquisition band only** |

Accent is `--primary` #c2410c (terracotta), hover `#9a3412`, tint `#fdf2ec`. The Shravani Mela
band uses `--warning` #d97706 as its eyebrow accent, matching `strips.tsx` — saffron, not
terracotta, so it reads as seasonal rather than as another CTA.

**One primary CTA per section.** Everything else is secondary (bordered) or tertiary (text link).

### 1.3 Spacing, layout, shape

- Section rhythm: `py-14 md:py-24` — supplied by `<Section>`, don't override without reason.
- Container: `container-page` = `max-w-7xl px-6 md:px-12`.
- Prose width: cap running text at `max-w-2xl`. Never full-bleed paragraphs.
- Grid gaps: `gap-4` mobile → `gap-6` desktop.
- Radius: cards `rounded-xl`, photos `rounded-lg`, pills `rounded-full`. Full-bleed blocks get
  `rounded-none!` (the `!` is load-bearing — `.skeleton` and some primitives set a radius in
  `@layer utilities` and a plain `rounded-none` ties and loses).
- Elevation: `shadow-card` resting, `shadow-raised` on hover/lift, `shadow-overlay` for dialogs.
  Three levels, no others.

### 1.4 Motion

- Easing `--ease-out-soft` `cubic-bezier(0.22,1,0.36,1)` for entrances; durations 150–300ms.
- Transform/opacity only. Never animate width/height/top/left.
- Photo hover: `scale-[1.03]` over 300ms, on the image inside an `overflow-hidden` parent.
- Press: the existing `.pressable` utility (`scale(0.98)` active).
- `prefers-reduced-motion` is already handled globally — don't add per-component guards.

### 1.5 Mobile-first, seriously

Nearly all traffic is Android on 4G. Design every section at **375px first**, then scale up.
Touch targets ≥44px. No horizontal scroll. Test at 375 / 768 / 1280.

---

## 2. Section-by-section spec

Numbering follows the strategy doc so the two can be read side by side. Each section states
**Band**, **Data**, and **Build** (reuse / extract / new).

---

### S1 · Sticky header — *new*

**Band:** canvas, `sticky top-0 z-40`, `bg-background/85 backdrop-blur-md`, `border-b border-border`.
Height 64px mobile / 72px desktop.

**Left:** the Deoghar BnB logo (§0.2) as `next/image`, `h-8 md:h-9 w-auto`, wrapped in a link to
`/` with `aria-label="Deoghar BnB — home"`. Mirrors `site-header.tsx`'s existing treatment.

**Right (desktop):** three items only —

| Item | Target | Style |
|---|---|---|
| `Stays` | `#stays` | `text-sm font-medium` |
| `Guides` | `/guides/` when it exists, else omit | `text-sm font-medium` |
| `List your property` | `#for-owners` | `text-sm` **bordered pill**, `border-border` |

**WhatsApp is not in the nav.** It lives in the sticky bottom bar (S3), matching the host
homepages. This is the right call: on mobile a thumb-reachable bottom bar converts better than a
top-right pill, and it keeps the header to three items.

The host CTA is a bordered pill rather than a filled one — visible, but never competing with the
hero's primary CTA. One filled primary button per screen.

**Link honestly.** `/guides/` doesn't exist yet (see §S1a). Until it ships, **omit the Guides
item entirely** rather than anchoring it somewhere unrelated. Never ship a nav item that 404s or
lies about its destination.

**Mobile:** logo + a `Menu` button opening a sheet with the three items. No hamburger-only
mystery meat — label it.

---

### S1a · Guides — how to build the blog *(decision needed before S1 ships)*

`Guides` is the SEO engine in the strategy doc (§4: six guide pages, `/guides/shravani-mela/`
first). You asked whether a free blog builder can be connected. Three real options:

| Option | What it is | Cost | Fit |
|---|---|---|---|
| **Reuse your own block system** ★ | A `posts` table + the existing `lib/blocks.ts` renderer and admin editors | Free, no new dependency | **Best fit** |
| Keystatic / Outstatic | Git-based CMS with an admin UI, content as MDX in the repo | Free | Adds a dependency; Next 16 support needs verifying before committing |
| Sanity / Notion-as-CMS | Hosted CMS, content over API | Free tier | External service, another login, content lives off-platform |

**Recommendation: the first.** You already have a validated block registry (8 block types:
paragraph, list, key_value, distances, faq, image, gallery, link_list), a `SectionRenderer` that
renders any of them, a `BlockPicker`, and per-block admin editors. A blog is: a `posts` table
(slug, title, excerpt, cover, published_at, content) reusing that exact machinery, a
`/guides/[slug]` route calling `SectionRenderer`, and one admin tab. You'd be writing posts in an
editor you already know, with zero new dependencies, no external service, and content that stays
in your own database.

The `faq` block type even gives you `FAQPage` schema on guide pages for free.

**Effort:** ~2 days. **This is Part B work (B1a) — not a blocker for the apex.** Ship the apex
with the Guides nav item omitted, add it when the blog lands.

---

### S2 · Hero — *new (pattern lifted from `landing/hero.tsx`)*

**Band:** full-bleed photo, `min-h-[560px] md:min-h-[620px]`, content bottom-left, `container-page`.

The tenant hero's scrim treatment is the reference — **two stacked gradients, not one**, because a
single bottom-up scrim dark enough for the headline swallows the whole photo:

```
linear-gradient(to top,   rgba(33,26,20,0.88) 0%, rgba(33,26,20,0.30) 68%, rgba(33,26,20,0.10) 100%),
linear-gradient(to right, rgba(33,26,20,0.65) 0%, rgba(33,26,20,0.10) 68%, rgba(33,26,20,0) 100%)
```

- **Eyebrow:** `देवघर · झारखंड` — `text-primary-tint` (not `text-primary`; terracotta on a dark
  photo fails contrast).
- **H1 Hindi:** अपने परिवार के लिए देवघर में एक अपना घर
- **H1 English:** Whole-flat homestays in Deoghar, minutes from Baba Baidyanath Dham
- **Subhead** (`max-w-xl`, `text-[rgba(253,251,247,0.88)]`): per doc §Section 2.
- **Primary CTA:** `घर देखिए — Find your stay` → `#stays`, `h-14` pill, `bg-primary`.
- **Secondary:** `WhatsApp us` → `wa.me/917033332227`, ghost on dark.
- **Trust strip:** 4 items, `text-sm`, wrap to 2×2 on mobile. **Ship as text with an icon, not
  as `✓` characters** — a check glyph as an icon violates the no-emoji-as-icon rule; use Lucide
  `Check` at `size-4`.

**Image:** must be a real Deoghar photo. The hero image currently used by the Kailasha site is a
homepage-media asset owned by that tenant — do not reach into a tenant's media for the platform
page. Needs a platform-owned asset in `public/` or a new `homepage-media` upload not scoped to a
tenant. **Flag this as a content blocker; do not ship a stock photo.**

---

### S3 · Sticky WhatsApp bar + filter chips

Two things replace the doc's date-search bar.

**3a — Sticky bottom bar.** Reuse `components/landing/sticky-bar.tsx` (plain props:
`whatsappHref`, `phone`, `replyMinutes`, `hoursStart`, `hoursStartHour`, `hoursEndHour`). Feed it
platform constants from `lib/platform-content.ts`, **not** any tenant's `site_settings`. Same
component, same behaviour and same position as the host homepages, so the network feels
consistent.

Reserve bottom padding on the page equal to the bar's height so the footer is never obscured.

**3b — Filter chips**, immediately above the grid, not a floating card:

`Walk to temple` · `Sleeps 6+` · `Free parking` · `Under ₹3,000`

- Client-side filtering of the already-loaded grid. **No route change, no refetch, no `/stays/`
  page needed.**
- Multi-select, `rounded-full border px-4 h-9`; active state `bg-primary text-primary-foreground`.
- Derive each chip's predicate from real data (`distanceFromTemple`, `max_guests`, `amenities`,
  `base_price`) — **and only render a chip if at least one property matches it.** A filter that
  can only ever return zero is worse than no filter.
- Always render a count: `Showing 4 of 6 homes`. With an empty result, show a `Clear filters`
  action rather than a bare empty grid.
- Chips are `<button>` with `aria-pressed`, keyboard-operable.

Date search is Part B (B3) — it needs cross-property availability and a results page.

---

### S4 · The homes grid — *reuse `PropertyCard`* — `id="stays"`

**Band:** canvas.

- **H2:** `हमारे घर · Our verified homes in Deoghar`
- **Intro** (`max-w-2xl`): "Every home is visited and verified by us. Real photos, real prices,
  and a direct line to the family who runs it."

**Grid — must hold up at 2, 6 and 12+:**

```
grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3
```

At 2 homes that leaves a hole in the `lg` row. Rather than special-casing the count in markup,
**centre the track when there are fewer than 3**: add `lg:grid-cols-2 max-w-4xl mx-auto` when
`properties.length < 3`. One ternary, and it stops being needed the moment the 4 new homes land.
Above 9, paginate or cap at 9 with `View all stays →`.

**Card:** extend `components/property-card.tsx` `<PropertyCard>` with **optional** props —
`distance?`, `hostName?`, `airbnbUrl?`, `airbnbReviews?`. **Do not fork it**; `/properties` renders
the same component and the two surfaces must stay identical. Optional props mean that page is
unaffected.

Card content, top to bottom:

1. Cover photo, `aspect-[4/3] rounded-lg`, hover `scale-[1.03]`.
2. **Title** — `font-display text-[19px] font-semibold`.
3. **Temple distance** — `MapPin` icon + `1.4 km · 15 min walk`, `text-sm text-text-muted`.
   `LandingProperty.distanceFromTemple` and `templeDistance()` in `lib/landing.ts` already derive
   this. The single most decision-relevant fact in this market, and nobody else surfaces it at
   card level.
4. **`Hosted by {host name}`** — `text-sm text-text-muted`. Comes free from
   `site_settings.business_name` joined on `tenant_id`. **This is what makes the page a network
   rather than a catalogue** — it tells a family there are real, different local families behind
   these homes.
5. `Sleeps 6 · 2 bathrooms` · amenities line.
6. `From ₹3,200 / night`.
7. **Airbnb line** (only where a channel exists) — `Also on Airbnb · ★ 4.9 (32 reviews) ↗`,
   `text-xs`, tertiary. Borrows Airbnb's trust for a brand nobody has heard of yet, and gives a
   cautious booker a familiar escape hatch instead of bouncing.

**On the Airbnb review counts — read this before implementing.**

You asked whether the number can be pulled from the listing. **It can't, not responsibly.**
Airbnb's Terms of Service prohibit automated scraping; there is no public API for listing reviews
(theirs is partner-only); the listing pages are JS-rendered behind bot detection, so a
server-side fetch from Vercel would be unreliable even setting the ToS aside. Anything built on
scraping would break silently and take the card's credibility with it.

**Do this instead — admin-entered, dated fields.** Two nullable columns on `booking_channels`:

```sql
alter table public.booking_channels
  add column if not exists rating          numeric(2,1) check (rating is null or (rating >= 0 and rating <= 5)),
  add column if not exists review_count    integer      check (review_count is null or review_count >= 0),
  add column if not exists ratings_checked_at date;
```

Surfaced in the existing Channels tab (`components/admin/tabs/channels-tab.tsx`) next to the
booking URL. Render the line only when `rating` and `review_count` are both set. This is
honest, takes a host ten seconds to update, and can't break.

If a number goes stale it's a stale number, not a broken page — and `ratings_checked_at` lets you
show or audit freshness later. **Do not put these figures into `AggregateRating` schema** for
your own site; they're Airbnb's ratings, not yours (see §S10).

Below grid: `View all stays →` → Part B (B3) until `/stays/` exists; omit the link rather than
anchoring it to itself.

---

### S5 · Whole-flat economics — *reuse `SavingsCalculator` verbatim*

**Band:** sand.

`components/landing/savings-calculator.tsx` takes **plain props** — `options`, `currency`,
`shareSummary`, `hotelRoomRate` — with no dependency on the tenant homepage builder. It drops
straight in. (`WhyApartment` is the tenant-coupled wrapper; use the calculator directly, not the wrapper.)

- **H2:** `Why one 2BHK beats three hotel rooms`
- **Body + footnote:** lift verbatim from the doc. **Keep the footnote** — it is what stops the
  calculator reading as a sales trick.
- `options`: every published property's `{ rate, sleeps }`, across tenants.
- `hotelRoomRate`: **this is a problem.** It currently comes from `site_settings.hotel_room_rate`,
  which is per-tenant, and the apex has no tenant. Use a platform constant in
  `lib/platform-content.ts` (see §4), seeded with Kailasha's current value. Do not silently read
  one tenant's setting to speak for the platform.

---

### S6 · Location module — *new, deliberately not exact*

**Band:** canvas.

You're right that exact distances break here. The tenant sites measure from *one door*; the apex
speaks for homes spread across Deoghar, so a single "1.4 km" figure would be wrong for most of
them. Precision that isn't true is worse than a range that is.

**H2:** `Where you'll be · देवघर में आपका ठिकाना`

**Replace the distance table with two honest layers:**

**6a — A promise, stated as a range.** One line, `font-display text-[22px] md:text-[28px]`,
centred, `max-w-3xl`:

> Every home we list is **within a 25-minute walk of Baba Baidyanath Dham** — most are far closer.

Derive the bound from live data rather than hardcoding it: take the widest
`distanceFromTemple` across published properties and round outward. Then it stays true as homes
are added, and it can never quietly become a lie. **If a home ever falls outside the stated
bound, the sentence must change, not the home's page** — so compute, don't type.

**6b — Landmark cards with ranges, not exact figures.** Four cards,
`grid gap-4 sm:grid-cols-2 lg:grid-cols-4`, `rounded-xl border border-border p-5`, Lucide icon
`size-5 text-primary`:

| Landmark | What we say |
|---|---|
| Baba Baidyanath Dham | `5–25 min walk` |
| Jasidih Railway Station | `15–20 min by cab` |
| Deoghar Airport | `25–30 min by cab` |
| Basukinath | `~1 hr by car` |

Each card: landmark name (`font-display text-[19px]`), the range (`text-[24px] tabular font-semibold
text-primary`), and a one-line note (`text-sm text-text-muted`).

**Then hand off to precision:** a closing line under the cards —

> Every home's own page lists its exact distance, measured from that door.

That sentence is what keeps the section honest *and* routes the reader to a property page, which
is where you want them anyway.

**Keep it plain HTML, never an image.** The doc is right that this is an AI-search magnet: a
clean, factual block about Deoghar geography is exactly what gets pulled into an AI answer with a
citation. Ranges cite just as well as exact figures.

Ranges live in `lib/platform-content.ts` (facts about a town, not tenant data); the walk-time
bound in 6a is computed from live property data.

**Not reusing `MapStrip`** — it's single-property and takes a tenant-builder `resolved` prop.
A multi-property map is a bigger piece of work; if you want one later it belongs in Part B.

---

### S7 · Comparison table — *extract `ComparisonTable` from `faq.tsx`*

**Band:** sand.

`ComparisonTable` exists in `components/landing/faq.tsx` but is **not exported**. Extract it to
`components/landing/comparison-table.tsx`, export it, and have `faq.tsx` import it — no behaviour
change to the tenant page.

- **H2:** `Us, a hotel, or a dharamshala — an honest comparison`
- **Intro:** *"A dharamshala is the cheapest option and we won't pretend otherwise."*
- Keep every row, **especially the "Cost for 6 people, 3 nights: Mid" cell.** Conceding the price
  point is the most persuasive thing on the page.

Mobile: the table must scroll inside `overflow-x-auto`, never squash to unreadable columns and
never force the page body to scroll horizontally.

---

### S8 · What we arrange — *new*

**Band:** canvas.

- **H2:** `दर्शन, गाड़ी, पूजा — सब हम देख लेंगे` / `Darshan, car, pooja — we'll handle it`
- 4 cards, `grid sm:grid-cols-2 gap-4 md:gap-6`, `rounded-xl border border-border p-6`.
- Lucide icons at `size-6 text-primary`: `Flame` (pooja), `Car` (pickup), `CarFront` (car+driver),
  `UtensilsCrossed` (food). One icon family, consistent stroke.
- Copy verbatim from doc §Section 8, **including the prices** (`From ₹600`, `From ₹2,500/day`) —
  concrete numbers are the whole point of the section.
- Closing line, full width: `All arranged on the same WhatsApp thread as your stay.`

This is the moat section. It should feel specific and slightly hand-written, not like a features grid.

---

### S9 · Shravani Mela band — **DROPPED**

Per your call. The `/guides/shravani-mela/` page stays in Part B (B1) — it's still the biggest
seasonal query volume in the market, and it works better as a real guide than as a homepage band.

**One line worth rescuing from it,** because it's the sharpest competitive claim you have and it
answers a specific, well-known local fear (Deoghar hotels dumping confirmed bookings during
Shravan when someone offers more):

> we do not cancel on guests, at any price.

**Move it into the FAQ (S12)** as the answer to *"Can I book for Shravani Mela dates?"*, and
consider it as a fourth item in the hero trust strip. Don't lose it just because the band goes.

With S9 dropped, the band rhythm becomes: S4 canvas → S5 sand → S6 canvas → S7 sand → S8 canvas →
S10 sand → S11 **ink** → S12 canvas → S13 sand. Still alternating, still one ink band. Good.

---

### S10 · Social proof — *new*

**Band:** sand.

- **H2:** `What families tell us afterwards`
- Aggregate line above cards: `★ 4.8 average from 56 verified guest reviews`

**Do not hardcode a rating you cannot substantiate.** The tenant's `proof` block stores real
figures; the apex needs its own, and if the network-wide number isn't known, show the per-home
numbers instead of inventing an aggregate. `AggregateRating` schema on a number you can't defend
is a real risk, not just a taste issue.

Reviews render with reviewer name **and source attribution** (`via Airbnb`) — third-party
attribution outperforms an unattributed quote on your own site. Source: `lib/platform-content.ts`
until there's a reviews table.

---

### S11 · Host acquisition band — *new, this is the current apex content relocated* — `id="for-owners"`

**Band:** `ink` — **the only ink band on the page.**

- **Eyebrow:** `Deoghar property owners` in `text-primary-tint`
- **H2:** `Have a flat in Deoghar? Let it earn between visits.`
- Body + 3 proof points per doc §Section 11, `grid sm:grid-cols-3 gap-6`, each with a Lucide icon.
- **Primary CTA:** `List your property →`. `/list-your-property/` doesn't exist yet — **point it
  at WhatsApp** with a prefilled owner-intent message until the page ships.
- **Secondary:** `Talk to us on WhatsApp`.

The existing apex copy ("We build and host a dedicated booking site for your property…") is good
and moves here nearly verbatim. Placed after all guest content so it never interrupts booking flow.

---

### S12 · FAQ — *reuse the tenant FAQ's accordion pattern*

**Band:** canvas.

- **H2:** `The things families actually ask us`
- 12 questions from doc §Section 12.
- **`FAQPage` schema is the highest-ROI structured data on this page** — implement it (§5).
- Accordion must be keyboard-operable and each answer must be in the DOM at load
  (`<details>`/`<summary>` or Radix Accordion) — **not injected on click**, or crawlers and AI
  assistants never see the answers, which defeats the entire purpose.
- Match the existing answering voice. The doc is right that this line is the best sentence on
  either site: *"Not a full kitchen — we don't want to promise one we don't have."* Everything
  else should sit in that register.
- Close: `Still have a question? Just ask — we don't mind.` **[Ask on WhatsApp]**

---

### S13 · Final CTA — *new*

**Band:** sand.

- **H2:** `अपना घर चुनिए।` / `Pick your home. We'll do the rest.`
- Repeat 2–3 property cards (reuse S4's data, no refetch).
- `[See all stays]` · `[WhatsApp us]` · `[Call 7033332227]`
- **Keep "Send to family."** Indian trip decisions get made in a family WhatsApp group; a share
  button aimed at that group is a conversion tool. The tenant site already has this — reuse the
  same share handler.

---

### S14 · Footer — *new*

**Band:** canvas, `border-t border-border`, `py-12 md:py-16`.

4 columns → 2 on tablet → 1 on mobile. **Only link to pages that exist.** Today that means:
Stays (2 property links), Company (List your property → anchor, Contact → WhatsApp).
The Guides and Areas columns are placeholders in the strategy — **omit them entirely rather than
shipping dead links**; add them as those pages land.

Include NAP (name, address, phone) in plain text for local SEO, plus a short bilingual descriptor.

---

## 3. Data layer

Two new files plus one migration.

**Migration `0026_channel_ratings.sql`** — the two nullable columns from §S4, plus the
self-recording line the new convention requires (`AGENTS.md`):

```sql
alter table public.booking_channels
  add column if not exists rating             numeric(2,1) check (rating is null or (rating >= 0 and rating <= 5)),
  add column if not exists review_count       integer      check (review_count is null or review_count >= 0),
  add column if not exists ratings_checked_at date;

insert into public.schema_migrations (version) values ('0026_channel_ratings')
  on conflict (version) do nothing;
```

`booking_channels` is already anon-readable for published properties, so no policy change. Verify
with `npm run migrations:status` before and after.

**`lib/platform.ts`** — cross-tenant queries via `createPublicClient()`:

```ts
export type PlatformProperty = {
  id, slug, title, sleeps, bathrooms, ratePerNight, currency,
  distanceFromTemple: string | null,      // via templeDistance()
  distanceWalkMinutes: number | null,     // parsed, for the §S6a bound + "walk to temple" chip
  amenities: string[],                    // for the filter chips
  images: …,
  tenantSlug: string,                     // → basePath "/s/{slug}"
  hostName: string,                       // site_settings.business_name
  airbnb: { url: string; rating: number | null; reviewCount: number | null } | null,
};

export const getPlatformProperties = cache(async (): Promise<PlatformProperty[]> => …);
```

One query with joins — `properties(status=published) → property_images, property_sections,
booking_channels` plus `tenants(slug)` and `site_settings(business_name)`. Reuse `readDistances()`
and `templeDistance()` from `lib/landing.ts`; export them if they're currently module-private.

**Sort order matters** and shouldn't be accidental: sort by temple distance ascending, so the
closest home leads. That's the field guests actually rank on. Ties break on `sort_order`.

**`lib/platform-content.ts`** — copy and facts that are the platform's, not any tenant's:
hero copy, the S6 landmark ranges, the four "what we arrange" cards, FAQ pairs, reviews,
`HOTEL_ROOM_RATE`, WhatsApp number, NAP, and the brand asset paths. Typed consts, not a CMS —
it keeps the page honest about what is platform-owned vs tenant-owned.

---

## 5. SEO & schema

| Item | Value |
|---|---|
| `title` | `Homestays & Family Flats in Deoghar Near Baba Baidyanath` (57 ch) |
| `description` | doc §2 (152 ch) |
| H1 | exactly one, the bilingual hero pair (Hindi + English in one `<h1>`) |
| canonical | `https://deogharbnb.space/` |
| robots | index, follow |

Set these in `app/(platform)/layout.tsx`'s metadata — and **use `title: { absolute: … }`**. A
plain string gets wrapped by the root layout's `"%s | Stays in Vrindavan"` template; the existing
platform layout already documents this trap and guards it. Don't regress it.

**Schema (JSON-LD, server-rendered):** `Organization` + `LocalBusiness`, `ItemList` around the
stays grid, `FAQPage` on S12, `BreadcrumbList`. Follow the existing `lib/landing-schema.ts`
pattern rather than inventing a second approach. **`AggregateRating` only if the number is real** (§S10).

---

## 6. Build order for Sonnet

Each step should typecheck, lint and build clean before the next.

0. **Brand assets + fallbacks** (§0.2) — drop the logo/favicon into `public/brand/`, then wire the
   host fallback chain in `site-header.tsx` and both tenant/portal layouts. Verify a tenant with
   **no** logo now shows the platform mark, and a tenant **with** one is unchanged.
1. **Migration** — `0026_channel_ratings.sql`, validated with the local parser, then run and
   confirmed via `npm run migrations:status`. Surface the fields in the Channels tab.
2. **Foundations** — `lib/platform-content.ts`, `lib/platform.ts` + `getPlatformProperties()`.
   Verify against the live anon key before wiring any UI.
3. **Extractions** — export `ComparisonTable` out of `faq.tsx`; extend `PropertyCard` with
   optional `distance` / `hostName` / `airbnbUrl` / `airbnbReviews`. Confirm `/properties` and the
   tenant homepage render identically to before.
4. **Shell** — S1 header, S14 footer, S3a sticky bar, page skeleton with all `<Section>` bands in
   order. Check the band rhythm reads correctly before any content lands.
5. **Guest content** — S2 hero, S4 grid, S3b filter chips, S5 calculator, S6 location.
6. **Persuasion** — S7 comparison, S8 arrange, S10 proof.
7. **Host + close** — S11 ink band, S12 FAQ, S13 final CTA.
8. **SEO** — metadata, JSON-LD, then verify rendered `<head>` and validate the FAQ schema.
9. **Verify** — 375 / 768 / 1280; **grid at 2 and at 6 properties** (temporarily duplicate the
   array to check the 6-up layout before the real homes land); no horizontal scroll; every nav
   and footer link resolves.

**Add `app/(platform)/loading.tsx`.** The apex is static today, but the moment it queries
properties it becomes dynamic — and the audit (`docs/audit-2026-08.md`) showed exactly what a
dynamic route without a loading boundary feels like.

---

## 7. Open decisions — need your call

**Settled by your last message:** marketplace framing (6 homes / 3 hosts), logo + favicon supplied
and used as the host fallback, nav = Stays / Guides / host CTA with WhatsApp in the sticky bar,
host name + Airbnb reviews on cards, generic location ranges, S9 dropped.

Still open:

1. **Brand assets** (§0.2) — SVG please, plus a **square mark**, not only a wide wordmark. The
   favicon and the mobile header both need the square form.
2. **Hero photograph** (§S2) — needs a platform-owned image. Still a blocker; I won't spec stock,
   and reaching into a tenant's media bucket for the platform page would be wrong.
3. **Airbnb ratings are manual** (§S4) — confirm you're happy entering rating + review count per
   channel in the admin. Scraping Airbnb isn't viable (ToS, no public API, bot detection), so
   this is the honest version.
4. **Review aggregate** (§S10) — is there a defensible network-wide number, or do we show
   per-home figures? Don't want `AggregateRating` schema on an invented number.
5. **Guides/blog approach** (§S1a) — my recommendation is reusing your own block system rather
   than adding a CMS. Confirm before B1a is scheduled.
6. **Brand collision** (strategy doc §0.2) — "Deoghar BnB" is a live 5.0★ Airbnb listing. Worth
   settling whether the wordmark always carries a descriptor before the logo is finalised.

---
---

# Part B — everything else in the strategy doc

Not part of this build. Roughly ordered by value per unit of effort.

| # | Item | Doc ref | Why it matters | Effort | Depends on |
|---|---|---|---|---|---|
| **B1a** | **Blog engine for `/guides/`** (§S1a) | §4 | **Unblocks the entire Guides nav item and every B-item below it.** Recommendation: a `posts` table reusing the existing `lib/blocks.ts` renderer + admin editors — no new dependency, no external service, and the `faq` block gives `FAQPage` schema free | 2 d | decision |
| B1 | **`/guides/shravani-mela/`** | §4 | Biggest seasonal query volume in the market; 35–55 lakh devotees. Doc says live by May. **Carries the content dropped from S9** | 2–3 d | B1a + content |
| B2 | **`/list-your-property/`** | §3 S11, §4 | The apex host band needs a real destination; currently WhatsApp | 1 d | — |
| B3 | **`/stays/` index + date search** | §0.3, §3 S3/S4 | Unlocks real check-in/check-out search — needs cross-property availability against `bookings` + `external_events`, and a results page. The apex's filter chips cover the near-term need | 2–3 d | — |
| B4 | **`/deoghar/near-baba-baidyanath-dham/`** | §4 | Highest commercial-intent proximity cluster | 1–2 d | — |
| B5 | **`/guides/baidyanath-darshan-timings/`** | §4 | Constant year-round volume; strong AI-citation magnet | 1 d | B1a + content |
| B6 | **Subdomain → root canonical strategy** | §0.3 | Real SEO upside, real risk. Pooling weak subdomains into one domain is correct in theory; doing it wrong de-indexes live inventory. **Decide deliberately, alone, with a rollback plan** | 1 d + monitoring | B3 |
| B7 | **Hindi `/hi/` homepage** | §1, §4 | Genuinely underserved; OTAs ship thin auto-translations. Needs `hreflang` | 2 d | apex done |
| B8 | **Google Business Profile per property** | §2 | Local SEO baseline. Not code — an afternoon of admin, outsized return | — | — |
| B9 | **`/guides/how-to-reach-deoghar/`**, **`/guides/basukinath-and-trikut/`** | §4 | Logistics intent; the second upsells the car service | 1 d ea | B1a |
| B10 | **`/guides/dharamshala-vs-homestay-deoghar/`** | §4 | Comparison intent converts well; S7's table is already most of the content | 0.5 d | B1a + S7 |
| B13 | **Multi-property map** | — | S6 ships as ranges, not a map. `MapStrip` is single-property and tenant-coupled, so a network map is its own build | 1–2 d | — |
| B11 | **Keyword volume validation** | §6 | Doc is explicit that it could not pull live volumes and the map is inferred from SERP structure. **Validate in Keyword Planner before spending on any of the above** | 0.5 d | — |
| B12 | **Consumer brand descriptor** | §0.2 | "Deoghar BnB" collides with a live 5.0★ Airbnb listing. Can't be trademarked; word-of-mouth will blur | — | decision |

**Two cautions carried from the doc, worth repeating:**

- *"The page has to be genuinely more useful than MakeMyTrip's version, or don't publish it.
  Thin programmatic pages will get you filtered, not ranked."* Applies to every B-item above.
- Head terms (`hotels in Deoghar`) are unwinnable and shouldn't be attempted. The whole strategy
  rests on long-tail, whole-flat, Hindi, and logistics intent — where the OTAs don't invest.
