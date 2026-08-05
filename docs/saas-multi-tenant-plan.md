# Manual bookings + multi-tenant SaaS — implementation plan

Two independent pieces of work. **Part A ships on its own in a day and touches
nothing structural.** Part B converts a single-tenant app into a SaaS and is
the real project — roughly ten phases, each independently shippable.

Decisions locked with the owner before writing this:

| Decision | Choice |
|---|---|
| Public URL scheme | **Path prefix now** (`/s/{tenant}`), designed so subdomains drop in later without a rewrite |
| Onboarding | **Superadmin invites only** — no public signup |
| Access gate | Tenant must be **manually marked paid** by superadmin before the admin panel unlocks (payment portal deferred — see B7) |
| Branding | **Full white-label** — logo, footer, contact details, metadata. No "Kailasha Stays" visible to another owner's guests |
| Per-tenant theming | Content and branding only. All tenants share the same components/layouts |

## Progress

| Phase | State | Migration |
|---|---|---|
| A — manual booking | **Done** | none needed |
| B0 — tenants, members, superadmin | **Done** | `0011_tenants.sql` |
| B1 — tenant_id + RLS rewrite | **Done**, isolation test green | `0012`, `0013` |
| B2 — site_settings per tenant | **Done** | `0014` |
| B3a — tenant-aware public queries | **Done** | none needed |
| B3b — routing (`/s/{tenant}`, proxy) | **Done**, verified against a real 2nd tenant | none needed |
| B4 — admin scoping | **Done** | none needed |
| B5 — white-label branding | **Done** | `0015`, `0016` |
| B6 — superadmin console + impersonation | **Done** | `0017` |
| B7 — invites + manual payment gate | **Done** (portal payment deferred, see below) | none needed |
| B8 onward | Not started | — |

B3 was split in two because the routing half is the only part that can take
the live site down, and it was much safer once the data layer underneath was
already proven. B3a changed no routes and no behaviour; B3b then only had to
pass a different value.

### Two things B3b is carrying that later phases must retire

- ~~The admin's "View live" link~~ — **done in B4**, now built from the
  admin's own tenant base path.
- ~~The guest portal's branding~~ — **done in B5.** get_booking_by_token's
  'settings' object (already scoped to the booking's tenant since B2) was
  widened with the branding columns, so the portal's header/footer/brand
  color/tab title all read from the booking's own tenant now, not the
  primary one.

Also worth knowing: `notFound()` inside a property page returns 200 in dev
rather than 404. Verified identical before and after B3b, so it is
pre-existing and not a routing regression — but it is a soft-404 worth
confirming against a production build at some point.

Tenant #1 is `kailasha-stays`. `supabase/tests/tenant_isolation.sql` is the
regression gate — **re-run it after any migration that touches RLS or adds a
table.** It is cheap, it rolls back, and it has already caught one real
cross-tenant leak that no amount of reading the policies would have found.

### What B1 taught us, that the rest of this plan depends on

RLS policies are **permissive: they OR together.** The first isolation run
failed on exactly the eight tables carrying a `*_public_read` policy, because
`for select to anon, authenticated` kept granting tenant A's logged-in admin
every published row of tenant B — regardless of how tightly the admin policy
was scoped. Tightening the admin side could never have fixed it.

Two rules follow, for every later phase:

1. **Adding a permissive policy can only widen access, never narrow it.** When
   scoping something, check what *else* already grants it.
2. **Never grant a public-read policy to `authenticated`.** The public site
   reads through `createPublicClient()`, which is cookie-free and always runs
   as `anon`. `authenticated` on a public-read policy means "any logged-in
   customer", which is never what is wanted.

### What B2 built, and the two bridge functions it left for B3/B4 to retire

`site_settings` moved from a `boolean` singleton PK to `tenant_id` as PK —
same shape `property_private` already used for its own per-property
singleton. Every tenant now gets a settings row automatically the moment it's
created (an AFTER INSERT trigger on `tenants`), so "the settings row is
missing" stops being a bug class.

Two of B2's tables have no session to resolve a tenant from, and B3/B4 don't
exist yet to solve that properly — so B2 added narrow, explicitly-temporary
bridges instead of blocking on phases that come after it:

- **`getPrimaryTenantId()`** (`lib/tenant.ts`) — what the **public** site uses.
  No request has a resolved tenant yet, so this answers "which tenant is this
  site" from `NEXT_PUBLIC_PRIMARY_TENANT_SLUG` (defaults to
  `kailasha-stays`). **B3 replaces every caller of this** with real
  per-request resolution.
- **`getCurrentTenantId()`** (`lib/admin/tenant.ts`) — what **admin writes**
  use. RLS alone isn't enough for an UPDATE: a superadmin belongs to every
  tenant, so an update scoped only by RLS would touch all of them at once.
  This picks the signed-in admin's first (today: only) membership row.
  **B4's `requireTenant()` replaces every caller of this.**

Neither survived: `getPrimaryTenantId()` is now only used by the routes that
genuinely have no tenant in the URL (`/stay/[token]`, the apex sitemap), and
`getCurrentTenantId()` was deleted outright in B4.

### What B6 built, and why the impersonation cookie isn't signed

`/superadmin` is a separate route tree gated by `requireSuperadmin()`, with
its queries in `lib/superadmin/queries.ts` — deliberately the one module that
spans tenants, kept apart from `lib/admin/queries.ts` (which is always
single-tenant) so the split itself documents the rule. A cross-tenant query
under `lib/admin/` is a bug; here it's the point.

**Impersonation** sets an `acting_tenant` cookie that `requireTenant()` reads
— but ONLY after re-reading `admin_users.is_superadmin` from the database for
the session's own user. The cookie names a tenant; it does not assert
permission to act on it. Forging it gains a non-superadmin nothing, because
the branch that reads it never executes for them. That's why it's httpOnly +
sameSite rather than signed: signing would protect the integrity of a value
whose integrity grants nothing. **If it ever starts carrying a claim the
server doesn't independently re-check — a role, an expiry — it must be
signed.**

This is also where B4 pays off: because every admin query already filters by
`tenant.id` from `requireTenant()`, impersonation needed no changes to any of
them. One resolution point moved, ~50 call sites followed.

`impersonation_log` (0017) is append-only by policy — superadmin-only SELECT
and INSERT, one narrow UPDATE for stamping `ended_at` on your own open row,
and **no DELETE policy at all**. It logs the session, not each write during
it; per-mutation logging would mean threading a writer through ~40 actions
for little gain over "X had access to Y between 14:02 and 14:19" while there
is one superadmin. Assertion 5 of the isolation test covers it.

### What B5 built

Five new site_settings columns (`0015`): `logo_path`, `favicon_path`,
`brand_color`, `legal_name`, `footer_note`. logo/favicon are plain columns
holding a homepage-media path — NOT rows in homepage_images — because a logo
isn't a photo a section picks from, it's a fixed singleton slot with its own
upload/remove action; putting it in the shared library would surface it in
every section's photo picker for no reason.

`brand_color` is one hex field in the admin, not four. `lib/brand-color.ts`
derives the hover/tint/ring shades the app's CSS tokens need from that one
value — otherwise a new brand color would mix with the ORIGINAL terracotta's
hardcoded hover/tint and every button's hover state would look broken, not
branded. `PublicSiteBranding` (`lib/types/database.ts`) narrows
SiteHeader/SiteFooter's prop type to only what they render, which is what let
the guest portal build branding straight from the RPC bundle instead of
needing a full SiteSettings object.

Favicon uses Next's `metadata.icons.icon` rather than a dynamic route —
omitted entirely (not pointed at a fallback) when unset, so the file-based
`/app/favicon.ico` convention stays in charge for a tenant with no favicon
of their own.

`0016` widens get_booking_by_token's 'settings' projection by six columns —
same tenant-scoped join B2 already fixed, just returning more of that row.
`getBookingBundle` gained a `cache()` wrapper (per-request de-dup only, not
a caching layer — the layout now needs the bundle for chrome alongside the
page's existing call for content) so that widening didn't cost a second RPC
round trip per request.

### What B4 established, and the rule the remaining phases follow

`requireTenant()` (`lib/admin/auth.ts`) replaces `requireAdmin()` as the entry
point for anything touching tenant data. It returns `{ supabase, user,
tenant, role, isSuperadmin }`, and B6's impersonation slots in by changing
where `tenant` comes from — a signed cookie instead of the account's own
membership — with no call site changing.

**The reason this phase was not merely defence in depth:** RLS scopes to
`current_tenant_ids()`, which for a superadmin is *every* tenant. The seeded
account IS a superadmin. So an unscoped admin query would not have been
"protected by RLS anyway" — it would have returned every tenant's rows the
moment a second tenant existed. `reorderSections` was the sharpest case: it
read all sections and renumbered them, which would have silently rewritten
another tenant's homepage order.

The scoping rule, applied consistently:

- **Explicitly filtered by `tenant.id`:** every read, every write to a
  top-level row (properties, addon_services, homepage_sections,
  homepage_images, site_settings), and anything not keyed by a unique id.
- **Left to RLS + the composite FKs from 0012:** mutations on child rows
  (images, contacts, sections, rate periods, payments, booking add-ons)
  reached by a unique id or their parent's id. A child physically cannot
  carry a tenant_id different from its parent's, so there is no cross-tenant
  write to prevent. This is documented at the top of the three action files
  it applies to, so it doesn't read as an oversight.

---

# Part A — Admin-created bookings

For a guest who enquired off-platform (WhatsApp, phone, walk-in). Admin enters
the details, a booking is created exactly like a converted enquiry, and the
guest gets the same portal link.

## What already exists

`convertEnquiryToBooking` (`app/admin/(dashboard)/enquiries/actions.ts:36`)
already does 90% of this: generates the portal token, sets the 7-day-after-
checkout expiry, handles the `23P01` overlap error, copies add-ons, redirects
to the booking detail page. The booking detail page's `PortalLinkSection`
already renders the copy-link and prefilled-WhatsApp-message UI, gated on
`source === 'direct' && portal_token` — both of which a manual booking
satisfies.

`bookings.enquiry_id` is already nullable. **No migration needed for Part A.**

## Work

1. **Extract** the shared creation logic out of `convertEnquiryToBooking` into
   `lib/admin/create-booking.ts` — token generation, insert, overlap-error
   mapping, add-on copying. Both callers use it.
2. **New action** `createManualBooking(formData)` in a new
   `app/admin/(dashboard)/bookings/actions.ts`. Same shape, but takes
   `property_id`, `guest_name`, `phone` from the form instead of an enquiry.
3. **New route** `app/admin/(dashboard)/bookings/new/` — page + client form:
   - Property picker (`listPropertyOptions()` already exists)
   - Guest name, phone (phone required — it's how the link gets delivered)
   - Check-in / check-out / guests
   - Live price quote reusing `quoteStay()` + `<PriceBreakdown>`, with the
     same "auto-filled, edit if you agreed different" behaviour as
     `ConvertToBookingForm`
   - Optional add-on multi-select from the property's enabled add-ons
   - Optional internal notes
4. **Entry point**: "New booking" button on `/admin/bookings`, mirroring the
   "New listing" button on `/admin/listings`.

## Notes

- Delivery of the confirmation link is **WhatsApp or copy-paste**, same as
  today. There is no email infrastructure in this project, and adding it is
  not in scope for Part A.
- Reuse `ConvertToBookingForm`'s auto-quote logic rather than reinventing it;
  factor the shared bits into one component if it stays readable.

**Effort:** ~250–350 LOC, one session. **Model: Sonnet.**

---

# Part B — Multi-tenant SaaS

## B0. The shape of the problem

Every one of these is currently global and must become per-tenant:

| Table | Today | Becomes |
|---|---|---|
| `site_settings` | one row, `id boolean primary key default true` | one row per tenant, PK `tenant_id` |
| `homepage_sections` | global, seeded once | per tenant, seeded per tenant |
| `homepage_images` | global media library | per tenant |
| `addon_services` | one shared catalog | per tenant |
| `properties` | global, `slug` globally unique | per tenant, slug unique **per tenant** |

Everything else (`property_images`, `property_sections`, `property_contacts`,
`property_private`, `rate_periods`, `calendar_sources`, `external_events`,
`enquiries`, `bookings`, `booking_addons`, `payments`, `guest_documents`)
hangs off `properties` or `bookings` and inherits tenancy.

### Specific gotchas found while surveying

These will bite during execution if not handled deliberately:

- **`properties.slug` is globally unique** (`0001_init.sql:80`). Two owners
  will both want `luxury-2bhk`. Must become `unique (tenant_id, slug)`.
- **`homepage_sections` unique pin index** is global
  (`homepage_sections_pin_unique`, `0008:271`). Must become
  `(tenant_id, pin)`.
- **`homepage_sections.key` uniqueness** — same, must be per tenant.
- **`site_settings` singleton** — `.eq("id", true)` appears in server actions
  (e.g. `homepage/actions.ts:171`). Every one must be re-pointed.
- **`ICAL_EXPORT_SECRET` is one shared secret** for `/api/ical/[propertyId]`.
  Today any holder can export any property's calendar. Across tenants that's a
  cross-tenant leak — needs a per-property token (phase B9).
- **Storage paths**: `property-images` uses `{propertyId}/{uuid}.ext`,
  `homepage-media` is flat `{uuid}.ext`. Storage RLS is `is_admin()`, which
  after multi-tenancy means *any* owner can write to *any* other owner's
  files. Must be re-pathed under `{tenantId}/` (phase B8).
- **Hardcoded brand strings** in `app/layout.tsx:28-29` (title template) and
  `app/(public)/page.tsx:34,44` (OG title/description say "Kailasha Stays").
  These must move into per-tenant settings or another owner's guests will see
  Kailasha's name in their tab title and WhatsApp preview.
- **`is_admin()`** is used by every policy and by storage policies. It stays,
  but only as "is this user *an* admin at all"; authorization becomes
  tenant-scoped on top of it.

## B1. Data model

```sql
create table public.tenants (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name          text not null,
  custom_domain text unique,           -- for the later subdomain/domain phase
  status        text not null default 'invited'
                  check (status in ('invited','awaiting_payment','active','suspended','cancelled')),
  created_at    timestamptz not null default now()
);

-- A join table rather than tenant_id on admin_users: staff accounts under one
-- owner are a near-certain follow-up, and retrofitting this later means
-- migrating live auth data.
create table public.tenant_members (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  role      text not null default 'owner' check (role in ('owner','staff')),
  primary key (tenant_id, user_id)
);

alter table public.admin_users add column is_superadmin boolean not null default false;
```

Then `tenant_id uuid not null references tenants(id) on delete cascade` on
every tenant-owned table.

**Denormalize `tenant_id` onto child tables too** (`property_images`,
`bookings`, `payments`, …) rather than resolving via joins in RLS. Reasons:
policies stay uniform and trivially auditable (`tenant_id = any(...)`), they
stay fast, and — critically — **right now there is exactly one tenant, so the
backfill is a one-line `update`.** This is the cheapest moment this change
will ever be.

Enforce with a trigger on insert that the child's `tenant_id` matches its
parent's, so a bug can't create a mismatched row.

## B2. RLS strategy

```sql
create or replace function public.current_tenant_ids()
returns uuid[] language sql stable security definer
set search_path = public, pg_temp as $$
  select case
    when exists (select 1 from admin_users where user_id = auth.uid() and is_superadmin)
      then array(select id from tenants)
    else array(select tenant_id from tenant_members where user_id = auth.uid())
  end;
$$;
```

Every admin policy becomes:

```sql
using (tenant_id = any(public.current_tenant_ids()))
with check (tenant_id = any(public.current_tenant_ids()))
```

Public read policies keep their current semantics (published properties are
readable by `anon`). Tenant filtering for public pages happens in the query
layer, not RLS — a published listing is public information by definition, and
trying to hide it from `anon` would break the public site.

**Non-negotiable deliverable for this phase:** a
`supabase/tests/tenant_isolation.sql` harness that creates two tenants with
data, assumes each user's role in turn, and asserts zero rows visible from the
other tenant **on every single table**. Multi-tenancy bugs are silent and
catastrophic; this is the only way to know it actually holds.

## B3. Tenant resolution & routing

One resolver, checked in this order, so the subdomain switch later is a config
change and not a rewrite:

```
1. tenants.custom_domain matches Host      → that tenant   (future)
2. Host is {slug}.{PLATFORM_DOMAIN}        → that tenant   (future)
3. First path segment /s/{slug}            → that tenant   (now)
4. PRIMARY_TENANT_SLUG env fallback        → Kailasha      (keeps the live site alive)
```

Route tree: `app/(public)/*` moves to `app/(public)/s/[tenant]/*`.

**The apex path must keep working.** `kailasha-stays.vercel.app/` and
`/properties/{slug}` are live and indexed. `proxy.ts` rewrites unprefixed
public paths to `/s/{PRIMARY_TENANT_SLUG}/...` — a rewrite, not a redirect, so
existing URLs and their SEO are untouched. New tenants use `/s/{slug}`.

`/stay/[token]` stays unprefixed (tokens are globally unique and guests get
the link directly), but must resolve its tenant from the booking to render the
right branding.

`sitemap.ts` and `robots.ts` become per-host/per-tenant.

## B4. Admin scoping

`requireAdmin()` becomes `requireTenant()`, returning `{ supabase, user,
tenant, role }`. Every function in `lib/admin/queries.ts` (403 lines) and
every server action (11 `actions.ts` files) gains a tenant filter.

RLS is the real enforcement — this layer is defence in depth and correct UI.
Do it as an exhaustive checklist, file by file, and have it reviewed.

## B5. White-label branding

Header and footer are **already fully settings-driven** — no hardcoded brand
in `site-header.tsx` or `site-footer.tsx`. Once `site_settings` is per-tenant,
business name, address, phone, email, WhatsApp, socials and maps link all
white-label for free.

What still needs building:

- `site_settings` gains `logo_path`, `favicon_path`, `brand_color`,
  `footer_note` (free text for legal/extra info), `legal_name`.
- Logo upload UI in Settings → new **Brand** tab. Reuse the existing media
  upload pattern; store under `{tenantId}/branding/` in `homepage-media`.
- `SiteHeader` renders the logo image when set, falling back to the business
  name as text (which is what it does today).
- **Move the hardcoded metadata**: `app/layout.tsx` title template and
  `app/(public)/page.tsx` OG title/description become per-tenant
  `generateMetadata()` in the `[tenant]` layout. Include favicon.
- Optional, cheap, high perceived value: `brand_color` injected as a CSS
  custom property override on the tenant layout.

## B6. Superadmin console + impersonation

- `/superadmin` route group, gated on `admin_users.is_superadmin`.
  `notFound()` for everyone else, matching how `/admin` hides itself today.
- Tenant list: status, owner email, listings count, last activity. Create
  tenant, suspend, mark paid.
- **"Manage as" impersonation**: sets a signed, short-lived cookie carrying
  the target `tenant_id`. `requireTenant()` honours it only when the user is a
  superadmin. The DB already permits it via `current_tenant_ids()`.
- **A persistent banner** must be visible on every page while impersonating,
  with a one-click exit. Acting on a customer's account without an obvious
  signal is how bad mistakes happen.
- `impersonation_log` table: who, which tenant, when, and every mutating
  action taken while impersonating.

## B7. Invites + payment gate — done, manual payment only

**Tenant lifecycle:** `invited → awaiting_payment → active` (with `suspended`
/ `cancelled` as terminal-ish states).

Shipped, scoped down from the original plan on the owner's call: **the
Razorpay portal and the `subscriptions` table are deferred**, not built. There
is no automated payment path yet — every activation is a superadmin marking a
tenant paid by hand. Revisit the portal once there's enough onboarding volume
that manual confirmation becomes the bottleneck; nothing here blocks adding
it later (`setTenantStatus` and the gate below don't care *why* a tenant is
`active`, only that it is).

What exists:

1. Superadmin creates the tenant and optionally invites the owner's email in
   the same form (`app/superadmin/actions.ts`'s `createTenant` /
   `inviteOwner`). Uses Supabase's `auth.admin.inviteUserByEmail` (service
   role, server-only) — this is the one place email exists, and Supabase
   handles delivery, so no email vendor is needed. The invite also writes the
   `admin_users` and `tenant_members` rows, which is what actually grants
   panel access — previously those rows only ever existed by hand in the SQL
   editor.
2. The invite link lands on the existing recovery flow
   (`/admin/auth/confirm` → `/admin/reset-password`) to set a password, then
   at `/admin`, which the gate below immediately redirects to `/admin/billing`
   since a freshly invited tenant isn't `active` yet.
3. Manual payment: the status dropdown already built in B6 (`setTenantStatus`)
   *is* the manual-mark-paid mechanism — no separate action or table needed
   for this scope.
4. **The gate**: `app/admin/(dashboard)/layout.tsx` redirects any non-active,
   non-superadmin tenant to `/admin/billing` (outside the dashboard route
   group, so no redirect loop), which shows status-specific copy and a
   sign-out button — no other admin page is reachable. Their **public site
   also stops serving** when not `active` — `getTenantBySlug()` has only ever
   resolved `status = 'active'` tenants, since B3b.

Superadmin is exempt from the gate, including while impersonating — acting on
a non-active tenant's behalf is exactly what impersonation is for.

## B8. Storage isolation

Both buckets currently let any admin write anywhere. After multi-tenancy that
is a live cross-tenant write vulnerability.

- **Carried over from B1:** `homepage_images_public_read` is still
  `using (true)`, so anon can enumerate every tenant's media library —
  including images placed on no page — and the bucket is public, so those
  paths are fetchable. Deliberately not closed in B1: the correct scope is
  "only images referenced by a visible section", which means scanning section
  jsonb for the image id, and getting it subtly wrong silently blanks photos
  on a live homepage. Close it here, against real content, with the isolation
  test as the gate.
- Re-path uploads to `{tenantId}/...` in both `property-images` and
  `homepage-media`.
- Storage RLS keyed on the first path segment:
  `(storage.foldername(name))[1]::uuid = any(public.current_tenant_ids())`.
- **Migrate existing files** with the copy-then-verify-then-update-then-delete
  order. Never delete first. This is the same `storage.copy()` +
  path-remapping pattern already used and proven by the listing-duplicate
  feature (`duplicateProperty`), including remapping `storage_path` references
  embedded in section JSON.

## B9. Per-property iCal token

Replace the single shared `ICAL_EXPORT_SECRET` with a per-property token
column, so one owner can't enumerate another's calendar feeds. Small, but it's
a genuine leak the moment there are two tenants — do it before onboarding
customer #2, not after.

## B10. Later — subdomains and custom domains

Resolver order from B3 already supports both. When a domain is bought:
wildcard DNS + wildcard domain on Vercel, set `PLATFORM_DOMAIN`, and start
issuing `{slug}.domain.com`. Keep `/s/{slug}` working as a permanent alias.
Custom domains need the Vercel Domains API plus a verification UI.

---

# Execution order and model per phase

Order matters: each phase leaves `main` deployable, and later phases assume
earlier ones. Do not reorder B1 before B0, or B4 before B1.

| # | Phase | Risk | Model | Why |
|---|---|---|---|---|
| A | Manual booking | Low | **Sonnet** | Self-contained, clear pattern to follow, no schema change |
| B0 | Tenants + members + roles | Med | **Opus** | Schema decisions here are expensive to reverse |
| B1 | `tenant_id` everywhere + RLS rewrite + isolation tests | **Highest** | **Opus** | A missed policy is a silent cross-tenant data leak |
| B2 | `site_settings` per tenant | Med | **Sonnet** | Shape fixed by B1; mechanical once decided |
| B3 | Tenant resolution + routing | **High** | **Opus** | Subtle: caching, static generation, and live SEO at stake |
| B4 | Admin query/action scoping | Med | **Sonnet** → **Opus** review | Repetitive but must be exhaustive; review catches the miss |
| B5 | White-label branding | Low | **Sonnet** | Mostly UI, groundwork already settings-driven |
| B6 | Superadmin console + impersonation | Med | **Opus** design, **Sonnet** UI | Security model needs care; the console itself is ordinary CRUD |
| B7 | Invites + payment gate | **High** | **Opus** gate/webhook, **Sonnet** UI | Payment correctness and access gating are unforgiving |
| B8 | Storage isolation + file migration | **High** | **Opus** | Irreversible file moves; proven pattern exists but must not be rushed |
| B9 | Per-property iCal token | Low | **Sonnet** | Small and well-defined |
| B10 | Subdomains / custom domains | Med | **Sonnet** | Resolver already built for it |

**Haiku** is a reasonable choice for none of the above as primary author — the
cheap-model win here is in the *review and docs* passes, not the builds.

## Rough sizing

Part A is a day. B0–B2 together are the foundation and probably the single
biggest chunk of thinking. B4 is the most tedious. B7 is the most
product-surface. B1, B3, B7 and B8 are where things break badly if rushed.

---

# Top risks

1. **Cross-tenant data leak.** The whole product dies on one instance of owner
   A seeing owner B's bookings. Mitigations: `tenant_id` NOT NULL everywhere,
   uniform RLS policies, the isolation test harness from B1, and an Opus
   review pass after B4.
2. **Breaking the live site's SEO.** `kailasha-stays.vercel.app` is indexed.
   Mitigation: rewrite (not redirect) the apex to the primary tenant; verify
   every existing URL still 200s before merging B3.
3. **Losing files in the storage migration.** Mitigation: copy → verify →
   update rows → only then delete; keep a manifest.
4. **Impersonation used carelessly.** Mitigation: banner, audit log,
   superadmin-only.
5. **Scope creep into per-tenant theming.** Branding is logo/colour/copy.
   Custom layouts per tenant is a different product — resist it.
