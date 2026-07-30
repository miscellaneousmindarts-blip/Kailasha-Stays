# Homepage builder v2 — implementation spec

Written for whoever builds the frontend. The SQL is
`supabase/migrations/0008_homepage_builder_v2.sql` and is the contract: if this
document and the migration disagree, the migration wins.

Goal: **everything on the homepage that isn't pulled from a property listing is
editable by the owner**, with real image uploads, repeatable lists, and a builder
UI worth using.

---

## 1. The one breaking change: content is now authoritative

v1 stored a *sparse override map*. An absent key meant "render the code
default", so `lib/homepage-blocks.ts` held the defaults and the DB held only
deliberate changes.

**That model is dropped.** `homepage_sections.content` now holds the whole
section. The migration seeds every builtin with today's exact copy, so applying
it changes nothing visible.

Why it had to change: the new requirements are mostly *lists* — trust-ribbon
items, FAQ entries, review cards, comparison rows, an arbitrary number of
"nothing hidden" photos. In a sparse model an empty list is ambiguous between
"the owner deleted every item" and "the owner hasn't touched this, use the
defaults". You cannot have both, and "the owner deleted every item" has to win
in a page builder.

**The cost, state it plainly to the user if it comes up:** improving default copy
in code will no longer reach the live page. `BUILTIN_DEFAULTS` becomes seed data
for a fresh install, not a live fallback. That is inherent to a page builder and
is the correct trade for full editability.

Consequences for the code:

- `copyFor()` / `imageOverride()` / the `Copy` reader in `lib/homepage.ts` go away.
  Components take typed content props instead.
- `BUILTIN_SECTIONS` in `lib/homepage-blocks.ts` stops being a flat
  `{key,label,kind}` field list. Each builtin gets a **zod schema** plus a
  dedicated editor component — same shape as the existing `layoutSchemas`.
- Validate on save *and* on render, as `property_sections` already does. A row
  that fails its schema is skipped, never crashes the page.

---

## 2. Tokens

Copy that currently interpolates a number in code (`Free cancellation up to
{service.cancelDays} days`) is seeded as text containing a token. Resolve
server-side before render.

| Token | Source |
|---|---|
| `{businessName}` | `site_settings.business_name` |
| `{hostName}` `{hostYears}` | `site_settings.host_name` / `host_years` |
| `{cancelDays}` `{advancePct}` `{replyMinutes}` | `site_settings` |
| `{hotelRoomRate}` `{hoursStart}` `{hoursEnd}` | `site_settings` |
| `{year}` | current year |
| `{temple}` | travel time to the anchor landmark, e.g. `15 min walk` |
| `{templeLabel}` `{templeDistance}` | anchor landmark name / `1.4 km` |
| `{count}` `{homes}` | published property count, pluralised noun |
| `{sleepsRange}` `{sleepsMax}` | `2–6` / `6` |

**Emptiness rule — this preserves current behaviour, don't skip it.** If any token
in a field resolves to empty, treat *the whole field* as empty. The renderer then
drops that field, or drops the whole list item if the field was required.

That is what stops a FAQ answer rendering as `"about  from the temple"`, which is
worse than no answer. `buildFaq()` currently achieves this by returning `null` for
items with missing numbers; the token resolver must reproduce it.

**For multi-paragraph fields the rule applies per paragraph**, not to the whole
field. `meet_host.body` is seeded as four paragraphs, one of which is *"My family
has been here {hostYears} years."* — with a whole-field rule, an unset
`host_years` would blank the entire biography instead of dropping one sentence.
Split on blank lines, resolve each paragraph, drop the ones that came back empty,
rejoin.

Ship two helpers:

```ts
resolveTokens(text: string, ctx: TokenCtx): string | null   // null if any token was empty
resolveProse(text: string, ctx: TokenCtx): string           // per-paragraph, drops empties
```

Every call site must handle `null` from the first one.

---

## 3. Schema

### `homepage_images` — a media library, not per-section uploads

One flat library. Sections reference rows **by id**; `alt` and `title` live on the
library row so the same photo cannot carry two different captions.

`storage_path` holds **either** a `homepage-media` bucket path **or** a
`/public` path — `imageUrl()` already passes `/`-prefixed values straight
through. That is how the migration seeds the eleven existing
`/images/landing/*.jpg` files into the library without moving any files.

`is_placeholder` drives the amber "Sample photo" badge. Uploads set it `false`.

Deletion: call `public.homepage_image_usage(id)` first and warn if non-zero. It
does a `content::text like '%uuid%'` scan — crude, but correct at this scale
(tens of rows) and shape-agnostic across every section schema. jsonb references
can't be foreign keys, so there is no DB-level guarantee here; the renderer must
skip an id it can't resolve.

**Render path:** fetch the whole library once per page render (it is small) and
build an `id -> row` map. Do not query per image.

### `homepage-media` bucket

Separate from `property-images` on purpose: homepage assets are not listing
photos, and deleting a property must never be able to take out the hero. Public
read, admin write, 10MB, same mime allow-list.

Reuse `uploadPropertyImage`'s shape for the upload action — validate mime and
size server-side, `randomUUID()` filename, never trust the client's name.

### `site_settings` — cross-section business facts

`reply_minutes`, `hours_start`, `hours_end`, `hours_start_hour`,
`hours_end_hour`, `cancel_days`, `advance_pct`, `hotel_room_rate`, `host_name`,
`host_years`, `maps_url`, `instagram_url`, `facebook_url`.

These live here rather than in a section because several sections quote the same
number and it must not drift. Setting `host_name` is what unhides Meet-your-host.

This retires most of `lib/landing-config.ts`. What stays there: the photography
brief comments, `map.propertySlug` / `maxPins` / `coordinateOverrides`, and
`propertyExtras`. Delete the rest (`host`, `distances`, `pricing`, `service`,
`proof`, `shravan`, `links`, `images`) once the sections read from the DB.

### `homepage_sections` — reorder and pinning

`locked` is replaced by two clearer flags. **`locked` is left in place, unused, so
the currently deployed admin page keeps working until the new one ships** — drop
it in a follow-up migration.

- `can_hide boolean` — false for `homes`; it is where the hero's primary button points.
- `pin text` — `'first'` for `hero`, `'last'` for `close`, else null.

Everything else reorders freely, which is the requirement. A pinned section
cannot be dragged out of its slot and nothing can be dragged past it.

`reorderSections(ids: string[])` writes `sort_order = index * 10` in one pass.
Validate server-side that pins still hold; reject the whole reorder if not.

---

## 4. Section content shapes

Authoritative versions are the zod schemas you'll write; the migration seeds
exactly these keys.

| Section | Content |
|---|---|
| `hero` | `eyebrow, headingHi, heading, lede, ctaLabelHi, ctaLabel, imageId, chips[{label}], variants[{src,heading,lede}]` |
| `trust_ribbon` | `items[{icon:'check'\|'star', label}]` |
| `map` | `heading, sub, landmarkImages[imageId\|null]` (positional against the property's Distances rows) |
| `homes` | `eyebrowHi, eyebrow, heading, lede` |
| `why_apartment` | `heading, body` |
| `meet_host` | `eyebrowHi, eyebrow, heading, body, imageId, videoCallTitle, videoCallBody, videoCallCta` |
| `nothing_hidden` | `heading, lede, photos[{imageId}], footNote` — **any number of photos** |
| `proof` | `heading, stats{googleRating,googleCount,googleReviewUrl,mmtRating,familiesHosted,yearStarted,repeatPct}, reviews[{name,city,stars,quote,reply,imageId}], carousel{enabled,speedSeconds,pauseOnHover}` |
| `services` | `note` |
| `shravan` | `eyebrow, heading, body, promise, ctaLabel, freeUnits, lastUpdated` |
| `faq` | `heading, items[{q,a,comparison}], comparisonRows[{label,us,hotel,dharamshala}], closingLine` |
| `close` | `headingHi, heading, body, ctaLabel, shareHeadingHi, shareBody` |

Notes that matter:

- **hero `variants`** are the `?src=` ad landing variants currently hardcoded in
  `heroCopy()`. `src` must stay one of `shravan|aiims|weekend`; the `brand`
  default is the section's own `heading`/`lede`. Keep the existing rule that an
  ad visitor's headline is never replaced by the generic one — message match is
  the point of the variant.
- **`proof.stats`** stay nullable and the section keeps its existing honesty
  behaviour: hide the numeric rating under 10 reviews, drop empty rungs, never
  pad. Do not let the editor invent a default rating.
- **`nothing_hidden.photos`** is unbounded in the schema, but the page has a
  16-image budget (§6). The editor should warn past the budget, not block.

---

## 5. Reviews carousel

Horizontal auto-scroll, config in `proof.carousel`.

Non-negotiable, these are project rules from CLAUDE.md, not preferences:

- `prefers-reduced-motion: reduce` → **no auto-scroll at all**, render a plain
  scrollable row. Not a slower scroll.
- Pause on hover *and* on focus-within, so keyboard users can read a card.
- Every card reachable by keyboard and by touch swipe; the auto-scroll must never
  be the only way to see a card.
- Animate `transform` only. Duplicate the list and translate for a seamless loop
  — do not animate `scrollLeft` in a `setInterval`.
- Cards need `aria-roledescription` or equivalent; don't leave it an unlabelled
  scroller.

With fewer than ~3 reviews, don't scroll at all — a two-card loop reads as broken.

---

## 6. Image budget

`lib/landing.ts` holds `MAX_LANDING_IMAGES = 16` and `FIXED_IMAGE_COUNT = 11`,
and sizes the property-card clusters from what's left. Fixed count is no longer a
constant of the code — it is now *whatever the owner picked*.

Compute it: count distinct `imageId`s referenced by all visible sections, and
pass that in place of the literal. If you leave the literal at 11 while the owner
adds a twelfth "nothing hidden" photo, the page silently goes over budget.

Currently 15 distinct sources render; it hits 16 the moment `host_name` is set and
Meet-your-host unhides. There is no headroom — surface the number in the admin.

---

## 7. Admin UX

Replace the flat accordion. Target: an owner on a laptop who wants to see what
they changed, and the same owner on a phone fixing one typo.

**Desktop ≥1024px — three panes.**

1. **Outline** (fixed ~280px): section list, drag handles, eye toggles, pin
   badges, an "unsaved" dot, `+ Add section`. Selecting scrolls the editor pane.
2. **Editor** (flexible): the selected section's form, one section at a time
   rather than twelve accordions. Sticky footer save bar with the dirty state.
3. **Preview** (collapsible ~420px): `<iframe src="/?preview=1">`, reloaded after
   each successful save, with a viewport toggle (phone / desktop). This is the
   highest-value part of the whole redesign — it is what makes editing copy feel
   safe. Add a `Jump to section` that posts a scroll message into the iframe.

**Mobile — master/detail.** Outline is the screen; tapping a section pushes the
editor with a back button. Preview becomes a "View homepage" link, not an iframe.
Respect the 5-item bottom-nav cap; Homepage already lives in the header.

**Drag reorder:** `@dnd-kit/core` + `@dnd-kit/sortable`, already a dependency and
already used in `photos-tab.tsx` — copy that setup, including its keyboard
sensor. Pinned rows get `disabled: true`.

Note for whoever verifies this: dnd-kit drags **cannot be driven by the browser
automation tool** — it listens for Pointer Events and scripted clicks send legacy
mouse events. Verify reordering through the server action and the resulting
`sort_order`, not by simulating a drag.

**Media library**: its own tab beside the section list. Grid of uploads, inline
`alt` + `title` editing, usage count per image, upload dropzone, delete with a
usage warning. Every image field in every editor opens a picker onto this library
with an "Upload new" affordance inline — one library, many entry points.

**Editors to build** (one per section, plus the five existing custom layouts):
a repeatable-list primitive gets reused by trust ribbon, FAQ, comparison rows,
reviews, nothing-hidden photos and hero chips. Build that primitive first —
add / remove / reorder / validate — and the rest are thin.

Reuse `components/admin/block-editors/faq-editor.tsx` for the FAQ shape; it
already does exactly this and the user asked for that pattern specifically.

---

## 8. Build order

**Do not apply the migration ahead of the code.** The deployed renderers keep any
string value in `content` as an override, so the seeded `{token}` copy would be
published verbatim — six fields break this way, listed at the top of the
migration. Land step 1 and step 3 together, or put the site in a state where
`/` is not serving from `homepage_sections` first.

1. Apply the migration alongside the token resolver. Verify the page is
   byte-identical to before.
2. `homepage_images` library + upload action + picker. Nothing else works without it.
3. Token resolver + tests for the emptiness rule.
4. Rewrite `lib/homepage.ts` to return typed, validated, token-resolved content.
5. Convert the twelve renderers to typed props. Page identical at every step.
6. Repeatable-list primitive, then the twelve editors.
7. Three-pane shell, drag reorder, preview iframe.
8. Reviews carousel last — it is the only genuinely new public-facing component.

Keep the page rendering correctly after every step; do not land 2–8 as one commit.
