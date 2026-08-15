# Apex homepage editor — plan

Give the superadmin the same power over deogharbnb.space's homepage that a
'branded' (Plan B) tenant already has over theirs: edit copy, swap images,
reorder and hide sections, without a deploy.

Migration: `0029_platform_sections.sql`.

---

## 0. The rule this is built around

**The apex is one page with one editor, forever.** Every design decision below
falls out of that. A tenant homepage builder has to serve forty hosts whose
copy has nothing in common, so 0008 made section content authoritative and
accepted losing code defaults. The apex has exactly one operator, and its real
copy already lives in `lib/platform-content.ts` — so code stays the default and
the database only holds what has actually been edited (§3).

---

## 1. Where the apex's content lives today

| Kind | Where | Example |
|---|---|---|
| Facts and lists | `lib/platform-content.ts` (303 lines of typed consts) | `PLATFORM_FAQ`, `PLATFORM_COMPARISON_ROWS`, `WHAT_WE_ARRANGE`, `PLATFORM_REVIEWS`, `LOCATION_RANGES` |
| Headings and ledes | Hardcoded inline in `components/platform/*.tsx` | "Why one 2BHK beats three hotel rooms" (in `page.tsx` itself) |
| Derived | Live queries | `HomesGrid` properties, `SavingsCalculator` rates, `LocationModule` widest walk time |

The consts carry provenance comments that are genuinely load-bearing — why the
reviews have no source platform attributed, why the comparison table's "Cost:
Mid" row must not be improved into a claim of being cheapest. **Those comments
must survive.** That is a direct argument for keeping the copy in code as the
default rather than dumping it into a seed where the reasoning is lost.

## 2. Why a new table, not a row in `homepage_sections`

`homepage_sections` is tenant-scoped: `unique (tenant_id, key)` since 0012, and
every policy on it routes through tenant membership. Reusing it means inventing
a fake `platform` tenant.

That is the trap. `tenants` became load-bearing in 0027 — `listActiveTenantSlugs()`,
`getPlatformProperties()`, `listPlatformPropertyPublicSlugs()`, the superadmin
console and the sitemap all read it. Each would need a guard to exclude the
impostor, forever, including in queries not yet written. One miss and a phantom
business appears in the product.

`platform_sections` has no `tenant_id` to get wrong. It is also *narrower* than
`homepage_sections`: no `kind`/`type` (there are no custom sections — the apex
is a designed narrative, and appending free-form blocks to the platform's own
shopfront is a feature nobody asked for). `key` doubles as the type: it names
the component that renders the section.

## 3. Content model: empty seed, code defaults

`content` seeds as `{}`. Each section has a zod schema whose `.default()`
values are built from the existing `lib/platform-content.ts` consts.

- Applying 0029 changes nothing visible.
- Until a section is edited, improving its copy in code still ships.
- On save, the editor writes **every field** of that section, so the row becomes
  authoritative wholesale from then on.

The emptied-list ambiguity that forced 0008's hand is handled by that last
point: zod `.default()` fires on an **absent** key, not on a present empty one,
so a deliberately emptied FAQ stores as `[]` and reads back as `[]` — never as
"fall back to code".

**Derived content stays derived.** `HomesGrid`'s properties, `SavingsCalculator`'s
rates and `LocationModule`'s widest walk time are computed from live data across
tenants. Only the copy around them becomes editable, using the same `{token}`
resolution the tenant builder already does (`buildTokenCtx`, `lib/homepage.ts`).

## 4. Sections

Order and keys mirror `app/(platform)/page.tsx` as it renders today.

| # | key | Component | Editable | Derived |
|---|---|---|---|---|
| 1 | `hero` | `PlatformHero` | heading, lede, image, CTA labels | — |
| 2 | `homes` | `HomesGrid` | heading, lede | property cards |
| 3 | `savings` | inline `<Section band="sand">` + `SavingsCalculator` | heading, lede | rate options, currency |
| 4 | `location` | `LocationModule` | promise line, items (label/range/note/icon), footnote | widest walk minutes |
| 5 | `comparison` | `ComparisonSection` | heading, lede, rows | — |
| 6 | `what_we_arrange` | `WhatWeArrange` | items (icon/title/body), footnote | — |
| 7 | `social_proof` | `SocialProof` | reviews (name/quote/stars) | — |
| 8 | `host_band` | `HostBand` | eyebrow, heading, body paragraphs | — |
| 9 | `faq` | `PlatformFaq` | items (q/a/comparison flag), footer note | — |
| 10 | `final_cta` | `FinalCta` | heading, body, button labels | properties, share summary |

`hero` is pinned first, `final_cta` pinned last, and `hero`/`homes`/`final_cta`
have `can_hide = false` — a homepage with no hero, no homes or no closing CTA is
broken in a way no amount of admin freedom justifies. The pin is enforced by a
unique partial index, not by application code.

Row deletion is refused by a trigger; hiding is the supported way to take a
section off the page.

## 5. What gets reused vs written

The expensive infrastructure already exists and is plan-agnostic:

**Reused as-is** — the `homepage-media` storage bucket (one flat bucket, already
`is_admin()`-gated for writes), `media-picker.tsx`, `media-library-panel.tsx`,
`upload-panel.tsx`, `repeatable-list.tsx` (drives four of the ten sections),
`use-save-action.tsx`, `save-bar.tsx`, dnd-kit reordering.

**Generalised** — `homepage-shell.tsx` already has the exact seam needed: a
`BUILTIN_EDITORS: Record<BuiltinKey, ComponentType>` registry at line 78. Extract
the shell's chrome (outline list, drag reorder, visibility toggles, media tab)
to take a section list + an editor registry as inputs; the tenant shell and the
platform shell then differ only in which registry they pass.

**Written new** — ten zod schemas + resolvers (`lib/platform-sections.ts`,
mirroring `lib/homepage.ts`), ten editors (`components/superadmin/homepage/`),
server actions, and the `/superadmin/homepage` route.

**Media:** `homepage_images.tenant_id` is `NOT NULL` (0012), and that constraint
is precisely what keeps one host's library out of another's —
`fetchHomepageRows()` leans on it because RLS alone doesn't (a known gap tracked
to B8). Relaxing it so `null` could mean "platform-owned" would weaken tenant
isolation across every existing media query to save one table. So 0029 adds
`platform_images` instead, same column shape minus `tenant_id`, superadmin-write
/ anon-read.

No new storage bucket is needed: `homepage-media` gates writes on `is_admin()`,
and `is_superadmin()` is a strict subset of that (both read `admin_users`; one
also requires the flag), so a superadmin already passes. The apex's brand assets
stay where they are — `lib/platform-assets.ts` resolves them from `/public` by
filesystem check, and the `hero` schema's image default is `null`, which falls
through to `resolvePlatformHeroImage()` exactly as today.

## 6. Build order

1. `lib/platform-sections.ts` — zod schemas defaulting to the existing consts,
   `fetchPlatformSections()`, `resolvePlatformContent()`. Fallback to all-code
   defaults when the table is missing, matching `fetchHomepageRows()`.
2. Wire `app/(platform)/page.tsx` and the ten components to read resolved
   content instead of importing consts directly. **Nothing visible changes** —
   verify by diffing rendered HTML before/after.
3. Generalise `homepage-shell.tsx` behind an editor registry; confirm the tenant
   builder is byte-for-byte unaffected.
4. `/superadmin/homepage` route + server actions (superadmin-guarded via the
   existing `requireSuperadmin()`), platform media scoped to `tenant_id is null`.
5. The ten editors, simplest first (`final_cta`, `host_band`, `comparison`)
   before the list-shaped ones.
6. Verification: edit each section, confirm it renders; hide a hideable section;
   confirm `hero`/`homes`/`final_cta` cannot be hidden; confirm a tenant owner
   gets 403 on the route and on the actions; confirm Kailasha Stays' own
   homepage is unchanged throughout.

## 7. Out of scope

- Custom/free-form sections on the apex (§2).
- Per-tenant apex overrides — there is one apex.
- Editing the platform header/footer or `StickyBar` chrome.
- Editing `PLATFORM_NAP`, contact numbers, or the savings calculator's hotel
  rate — these are operational config that also feed JSON-LD and WhatsApp
  links, and belong in settings, not a page builder.
- The blog (`posts`), planned separately.
