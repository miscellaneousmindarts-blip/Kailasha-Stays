# Two tenant plans — build plan

**For implementation by Sonnet.** Written against commit `27fc8ef`.
Migration is already written and parser-validated: `supabase/migrations/0027_tenant_plans.sql`.

---

## 0. The one rule everything hangs off

> **The apex is a closed front door.** A guest who arrives on `deogharbnb.space`
> can browse, open any property, and book it — and never once crosses into an
> owner's own site.

That rule is what makes the two plans coherent:

| | **Plan A — `listing`** | **Plan B — `branded`** |
|---|---|---|
| Admin login | ✅ full | ✅ full |
| Listed on the apex | ✅ | ✅ |
| Own subdomain + homepage | ❌ | ✅ |
| Own logo / colours / favicon | ❌ | ✅ |
| Reached **from the apex** | apex property page | **apex property page** (identical) |
| Reached from their own marketing | — | their branded site |

The row that matters is the second-to-last one. **A Plan B property opened from
the apex behaves exactly like a Plan A property.** Same page, same chrome, same
booking flow. The only way to reach a Plan B owner's branded site is to already
know their address — the apex never links there.

### 0.1 What this breaks today, and why it's the crux of the work

Right now the apex homepage's cards link to `/s/{tenantSlug}/properties/{slug}` —
which **is** the owner's own site, tenant header and all. That's precisely the
thing the rule forbids, and it's the single largest change here: the apex needs
its own property page, at its own URL, under its own chrome.

---

## 1. Migration — `0027_tenant_plans.sql` (written, validated, **not yet run**)

Two changes. Parser output: `OK file parse (11 stmt)`.

### 1.1 `tenants.plan`

```sql
alter table public.tenants
  add column if not exists plan text not null default 'branded'
    check (plan in ('listing', 'branded'));

alter table public.tenants alter column plan set default 'listing';
```

**The default is set twice on purpose, and it is not a mistake.** Adding the
column with `default 'branded'` is what backfills the tenants that already
exist — every one of them predates the split and has a live branded site, so
defaulting them to `listing` would take those sites offline the moment the
migration ran. Re-pointing the default at `listing` immediately after makes it
the entry plan for everyone created from here on.

Doing it this way rather than `add column ... default 'listing'` followed by an
`UPDATE ... WHERE plan = 'listing'` also keeps the migration **safe to re-run**:
that UPDATE would silently promote genuine Plan A tenants to branded the second
time it executed.

### 1.2 `properties.public_slug`

The apex needs one URL per property that is unique across *all* tenants.
`properties.slug` cannot serve: since `0012_tenant_scoping.sql` it is unique
only per `(tenant_id, slug)`, and in a market this narrow two owners both
naming a listing `premium-2bhk-apartment` is likely, not hypothetical.

- Nullable column + unique index (Postgres permits many NULLs under one).
- Backfilled: oldest property keeps the clean slug, later collisions get `-2`, `-3`.
- A `BEFORE INSERT` trigger assigns it for new properties.
- **Assigned once, never rewritten** when the owner edits their own slug — a
  public URL that moves under an indexed page costs more than a stale-looking one.

Run it, then confirm with `npm run migrations:status` (expect 27 applied, no
duplicate numbers).

### 1.3 A second migration is needed later — do not write it yet

Guest-portal branding (§6) needs `get_booking_by_token` to return the tenant's
plan. That means a **full `create or replace` reproducing the current function
body verbatim** plus one field — the pattern `0023_booking_pricing_breakdown.sql`
already follows. It's a SECURITY DEFINER function on the guest-facing critical
path, so it should be written at implementation time against the then-current
body rather than pre-written here and allowed to drift.

---

## 2. Routing & access control

### 2.1 Blocking Plan A subdomains — one chokepoint

`lib/tenant.ts`'s `getTenantBySlug()` is already the single gate every public
tenant page passes through (the layout resolves the tenant and `notFound()`s).
Plan A rides the same path:

1. Add `plan` to `PublicTenant` and to the `select()` in `getTenantBySlug`.
2. `app/(public)/s/[tenant]/layout.tsx` → `notFound()` when `tenant.plan === "listing"`.
   Everything nested under it is covered by that one check.
3. `listActiveTenantSlugs()` → filter to `plan = 'branded'`, so `generateStaticParams`
   stops prerendering pages that will only 404.
4. `listPublishedPropertyPaths()` (`lib/queries.ts`) → same filter, same reason.

**Do not put the plan check in `proxy.ts`.** That file is deliberately
database-free — its own header explains that a lookup there would put a network
round trip in front of every request including static assets. A Plan A
subdomain rewrites to `/s/{slug}` and the layout 404s it, exactly as a
suspended tenant does today.

### 2.2 `/stays/*` on a tenant host

`isTenantPath()` in `proxy.ts` doesn't list `/stays`, and `isGlobalPath()`
doesn't either — so today `kailasha-stays.deogharbnb.space/stays/foo` would
fall through and quietly serve the **apex** property page on a tenant's host.
That's duplicate content on a domain that shouldn't have it.

Fix in `proxyTenantHost()`: redirect `/stays/*` (301) to the same path on the
platform domain. One-line addition next to the existing `/admin` redirect.

### 2.3 New route

```
app/(platform)/stays/[slug]/page.tsx        ← the apex property page
```

`export const revalidate = 300` and a `generateStaticParams()` over every
published property of every active tenant, matching the tenant property page.
The apex *homepage* stays `force-dynamic`; this page has no reason to be.

---

## 3. The apex property page

Content is the tenant property page minus the tenant. Use
`app/(public)/s/[tenant]/properties/[slug]/page.tsx` as the reference — the
section order there is already good and shouldn't be redesigned here.

**Reuse unchanged** (all already tenant-agnostic): `PropertyGallery`,
`SectionList`, `BookingCard`, `amenity()`, the map embed, "Things to know",
room-service block.

**New data function**, `lib/platform.ts`:

```ts
getPlatformPropertyByPublicSlug(publicSlug: string): Promise<PlatformPropertyDetail | null>
```

One query: property (by `public_slug`, `status = 'published'`) + `property_images`
+ `property_sections` + `rate_periods` + `booking_channels` + its tenant
(`slug`, `plan`, `status = 'active'`, and `site_settings` for
`whatsapp_number`, `host_name`, `default_check_in_time`, `default_check_out_time`).

### 3.1 What must NOT appear

- **No `SiteHeader` / `SiteFooter`.** Those are tenant-branded. Use
  `PlatformHeader` / `PlatformFooter`.
- **No business name, logo, or brand colour** from `site_settings`. Read that
  row for *operational* fields only (times, WhatsApp). `brand_color` in
  particular must not be applied — the apex is always terracotta.
- **No link back to the owner's site**, anywhere, in any plan.

### 3.2 Two leak risks worth knowing about

**Admin-authored sections.** `SectionList` renders whatever the owner put in
their `property_sections`, and the `link_list` block type accepts any URL — a
Plan B owner can put "visit our website" in a section and it will render on the
apex. Not worth engineering around now (one owner, easily spotted), but it is a
policy question rather than a bug, and it should be a known one.

**WhatsApp identity.** Booking on the apex opens WhatsApp to the *owner's*
number, whose display name may well be their business name. That's fine and
intended — the rule is about web navigation, and the owner is the one who
actually services the stay — but it is worth stating explicitly rather than
discovering later. See §7.1.

### 3.3 Header/footer belong in the layout now

`PlatformHeader` and `PlatformFooter` currently render inside
`app/(platform)/page.tsx`. Move both into `app/(platform)/layout.tsx` so
`/stays/[slug]` gets them too. `getPlatformProperties()` is `cache()`-wrapped,
so the layout and the homepage calling it costs one round trip, not two.

**Leave `StickyBar` in the homepage's `page.tsx` — do not move it to the layout.**
`BookingCard` renders its own `fixed inset-x-0 bottom-0` mobile bar; a second
fixed bottom bar from the layout would sit on top of it and make the primary
booking action unreachable on a phone.

---

## 4. Apex homepage changes

- `PropertyCard`'s `basePath` on the apex becomes `/stays/{public_slug}` instead
  of `/s/{tenantSlug}`. `PlatformProperty` gains `publicSlug`; keep `basePath`
  for any caller that genuinely wants the tenant site, or drop it if none remain.
- `PlatformFooter`'s "Stays" column links likewise.
- `FinalCta`'s repeated cards likewise (it reuses `PropertyCard`, so this
  follows automatically).
- The grid keeps showing **every** published property across both plans —
  unchanged.

---

## 5. Admin panel

Plan A owners keep the whole operational admin: dashboard, calendar, bookings,
enquiries, listings, add-ons, settings. They lose only what they don't have.

1. `AdminTenant` (`lib/admin/auth.ts`) gains `plan`; add it to both `select()`
   calls (the impersonation branch and the membership branch).
2. `lib/admin/nav.ts` — export `navGroupsFor(plan)` / `moreGroupsFor(plan)`
   rather than the current bare `NAV_GROUPS` / `MORE_GROUPS` consts, and drop
   the **Homepage** item for `listing`. Listings stays: property sections still
   render on the apex page.
3. **`/admin/homepage` must itself `notFound()` for a listing tenant**, not
   merely vanish from the nav. Hiding a link is not access control.
4. `/admin/settings` — hide the branding block (logo, favicon, brand colour) for
   `listing`. Keep everything else: contact details, WhatsApp, check-in/out
   defaults, cancellation policy, hotel comparison rate are all still live on
   the apex.
5. Anywhere an admin screen links to "your live site", a listing tenant should
   get their apex property URL instead.
6. A short, honest line on the dashboard for listing tenants — *"Your homes are
   listed on deogharbnb.space"* with the link — so the absent Homepage tab reads
   as a plan boundary rather than a missing feature.

---

## 6. Guest portal branding

A Plan A guest books on `deogharbnb.space` and never sees the owner's brand.
Their portal at `/stay/{token}` showing "Kailasha Stays" branding would be a
non-sequitur.

**Rule: portal branding follows the tenant's plan.** `listing` → Deoghar BnB
branding. `branded` → the owner's, unchanged.

Needs the §1.3 migration (plan in the `get_booking_by_token` payload), then a
branch in `app/(public)/stay/[token]/layout.tsx` and `page.tsx`'s
`generateMetadata`.

**Known imperfection, accepted deliberately:** a guest who books a *Plan B*
property *from the apex* gets that owner's branded portal. Making the portal
follow where the booking originated rather than the tenant's plan would mean
recording an origin on every booking and threading it through the RPC. Not
worth it for the first release — and a Plan B owner services their own guests
anyway, so the guest meets that brand regardless.

---

## 7. SEO

### 7.1 The duplicate that this design creates

A Plan B property will exist at two live URLs:

```
deogharbnb.space/stays/{public_slug}                       ← apex
kailasha-stays.deogharbnb.space/properties/{slug}          ← owner's site
```

Same photos, same copy, same price. This must be resolved explicitly or both
pages compete with each other.

**Recommendation:**

| Plan | Canonical | Why |
|---|---|---|
| `listing` | the apex page (self) | it's the only place the property exists |
| `branded` | the **owner's** page — apex page emits `rel=canonical` pointing at it | Plan B is partly *paying* for their own search surface; taking it back would be selling them something and then keeping it |

A canonical tag is a signal to crawlers, not a user-facing link — it does not
violate §0's rule.

**The cost, stated plainly:** the apex accrues no search value for Plan B
properties. If the priority later flips to consolidating all authority on the
apex (item B6 in `docs/audit-2026-08.md`), that's a deliberate switch with real
risk to pages that already rank — not something to default into here.

### 7.2 Sitemaps

`app/sitemap.ts` returns `[]` on the platform host today. It should return the
apex homepage plus `/stays/{public_slug}` for **Plan A properties only** —
listing a URL that canonicals elsewhere is a mild anti-pattern, so Plan B
properties stay in their own tenant's sitemap, which already works.

---

## 8. Superadmin

- Plan selector on tenant create and tenant edit.
- **Downgrading branded → listing must also clear `canonical_host`.** Left set,
  `tenantBasePath()`/`tenantOrigin()` keep generating bare links for a host that
  no longer serves. Worth enforcing in the action rather than leaving to memory.
- Upgrading listing → branded is safe on its own, but the tenant will have no
  logo, colours or homepage content until they fill them in — the homepage
  builder's defaults cover this (`DEFAULT_SECTION_ORDER` renders an all-defaults
  page), so it won't render broken.

---

## 9. Open decisions — need your call

1. **Canonical for Plan B (§7.1).** Recommendation above; the alternative
   (apex canonical always) is a legitimate product choice with the opposite
   trade-off.
2. **Booking contact on the apex (§3.2).** Enquiry → owner's WhatsApp, as
   today? Or platform-mediated, truly Airbnb-style? Owner's WhatsApp is what
   the current `create_enquiry` → WhatsApp flow already does and needs no work;
   platform-mediated is a real operational commitment (someone has to answer).
   **I'd keep owner's WhatsApp** — the platform can't service bookings it has
   no capacity for.
3. **Should Plan A owners set their own prices/policies?** Assumed yes
   (nothing in this plan changes it) — flagging only because "like Airbnb"
   sometimes implies platform-set terms.
4. **Enquiry attribution.** Knowing whether a lead came from the apex or a
   tenant site is genuinely useful for judging whether the marketplace works.
   It needs an `origin` column plus a `create_enquiry` signature change — and
   that function must be **dropped and recreated**, not `create or replace`d
   with an extra defaulted parameter, which would create an overload that makes
   every existing call ambiguous. Cheap, but not free, and easy to defer.

---

## 10. Build order

Each step should typecheck, lint and build clean before the next.

1. **Migration** — run `0027`, confirm via `npm run migrations:status`.
2. **Types + data** — `plan` into `Tenant`/`PublicTenant`/`AdminTenant`,
   `public_slug` into `Property`; `getPlatformPropertyByPublicSlug()`.
3. **Gate Plan A sites** — `getTenantBySlug`, tenant layout `notFound()`,
   both `generateStaticParams` sources, proxy `/stays` redirect. Verify a
   branded tenant's site is completely unchanged.
4. **Apex property page** — `/stays/[slug]`, header/footer into the layout
   (watch the StickyBar collision in §3.3).
5. **Re-point apex links** — cards, footer, final CTA → `/stays/{public_slug}`.
6. **Admin gating** — nav, route guards, settings, dashboard link.
7. **Guest portal branding** — write and run the §1.3 migration, then branch.
8. **SEO** — canonicals, apex sitemap.
9. **Superadmin** — plan selector, canonical_host clearing.

**Verify at the end, explicitly:** create a throwaway `listing` tenant with one
published property and confirm — its subdomain 404s, its property is reachable
and bookable at `/stays/{slug}`, its admin has no Homepage tab, `/admin/homepage`
404s for it, and Kailasha Stays' own site is byte-for-byte unaffected.

---

## 11. Out of scope

Untouched by this plan, still open from `docs/apex-page-plan.md` Part B: the
guides/blog engine, `/stays/` index with real date search,
`/list-your-property/`, the subdomain→root canonical consolidation (B6), and
billing/pricing for the plans themselves — this adds the *plan* column, not a
way to charge for it.
