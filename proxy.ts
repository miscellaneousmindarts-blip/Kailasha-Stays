import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";
import { normalizeHost, resolveHost } from "@/lib/hosts";
import { publicEnv } from "@/lib/env";

/**
 * Two jobs, in this order:
 *
 *   1. Map an incoming request to the tenant whose site it belongs to.
 *   2. Refresh the Supabase auth cookie (Server Components can't write
 *      cookies, so without this a session would silently expire mid-visit).
 *
 * ── On the tenant mapping ────────────────────────────────────────────────
 *
 * Public pages live at /s/{tenant}/... internally, and there are now two
 * ways in:
 *
 *   HOST   {slug}.deogharbnb.space/properties/x  → rewrite to /s/{slug}/...
 *   PATH   deogharbnb.space/s/{slug}/properties/x → served as-is
 *
 * The host route is the destination (phase C1). The path route is what
 * exists today and keeps working unchanged — including the apex rewrite that
 * keeps every indexed kailasha-stays.vercel.app URL byte-identical. Phase C3
 * is what retires the path form and 301s it to the host form; until then
 * both serve, so this phase can ship without moving a live site.
 *
 * That is also why a tenant host serves /s/{slug}/... without redirecting:
 * links in the static HTML still carry the prefix until C3 flips
 * tenantBasePath() to "", and redirecting every one of them would put a 301
 * in front of every internal navigation for no gain. The duplicate-URL
 * question those two paths raise is answered by canonical tags in C2.
 */

const PRIMARY = publicEnv.primaryTenantSlug;

/**
 * Google's site-verification file, e.g. /googlef87171f88484ef18.html —
 * proves ownership of a specific HOST, so it has to load with a direct 200
 * on whatever host Search Console is checking, never a redirect. The same
 * failure mode as the /api carve-out below: a well-known, fixed-purpose path
 * that a blanket redirect would silently break. Host-agnostic on purpose —
 * the same requirement will apply to any tenant custom domain later.
 */
const GOOGLE_VERIFICATION_RE = /^\/google[a-f0-9]+\.html$/;

/** Paths that are not a tenant's public site and must pass through untouched. */
function isGlobalPath(pathname: string): boolean {
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/superadmin") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/stay") ||
    pathname.startsWith("/_next") ||
    pathname === "/sitemap.xml" ||
    pathname === "/robots.txt" ||
    pathname === "/favicon.ico"
  );
}

/**
 * Bare paths that belong to a tenant's site and therefore get rewritten.
 *
 * Deliberately an allowlist rather than "everything not global": rewriting
 * anything unrecognised would hand genuine 404s to a route that can only
 * render a tenant's pages, and would silently swallow any new top-level
 * route added later without a thought about tenancy.
 */
function isTenantPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/properties" ||
    pathname.startsWith("/properties/")
  );
}

/**
 * A request arriving on {slug}.{platformDomain}.
 *
 * The slug is not verified here — see lib/hosts.ts for why. An invented
 * subdomain rewrites into /s/{slug}, where the tenant layout resolves it and
 * 404s. A suspended tenant takes the same path, because getTenantBySlug()
 * only ever resolves active ones.
 */
function proxyTenantHost(request: NextRequest, slug: string) {
  const { pathname, search } = request.nextUrl;

  // The admin panel lives on exactly one host, so an auth cookie is never
  // scoped to a domain that every tenant subdomain shares. 308 rather than
  // 301: it preserves the method, so a POST that lands here (a stale form,
  // a Server Action) is redirected rather than silently downgraded to GET.
  if (pathname.startsWith("/admin") || pathname.startsWith("/superadmin")) {
    if (publicEnv.adminHost) {
      return NextResponse.redirect(
        new URL(`${pathname}${search}`, `https://${publicEnv.adminHost}`),
        308,
      );
    }
  }

  // Infrastructure, the API and the guest portal are host-agnostic: they
  // resolve their own tenant (from a booking token, or not at all) and must
  // not be rewritten into a tenant's page tree.
  //
  // /sitemap.xml and /robots.txt pass through to the platform-level ones for
  // now, which is wrong for a tenant host — C2 makes them per-tenant. It is
  // not exploitable in the meantime because no subdomain resolves in
  // production until the wildcard certificate exists.
  if (isGlobalPath(pathname)) {
    return updateSession(request);
  }

  // Links still carry /s/{slug} until C3; serve them here rather than
  // bouncing every internal navigation through a redirect.
  if (pathname === `/s/${slug}` || pathname.startsWith(`/s/${slug}/`)) {
    return updateSession(request);
  }

  if (isTenantPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = `/s/${slug}${pathname === "/" ? "" : pathname}`;
    return updateSession(request, () => NextResponse.rewrite(url));
  }

  return updateSession(request);
}

/**
 * A host a tenant has moved off. Everything 301s to the same path on the new
 * host — with one carve-out that matters more than it looks.
 *
 * /api is NOT redirected, permanently. Two live integrations hold URLs on
 * the old host and neither would survive a redirect:
 *
 *   - pg_cron calls /api/cron/sync-calendars through pg_net, which does not
 *     follow redirects. Calendar sync would stop, silently.
 *   - iCal export URLs are pasted into Airbnb and Booking.com. Whether those
 *     follow a redirect is their choice, not ours, and the failure shows up
 *     as double bookings rather than an error.
 *
 * The old host keeps answering /api forever. It costs nothing — it is the
 * deployment URL and cannot disappear — and it removes any need to
 * re-coordinate with third parties on someone else's schedule.
 *
 * The Google-verification carve-out lives above, in proxy() itself, because
 * it has to apply before ANY host branch — not just this one.
 */
function proxyLegacyHost(request: NextRequest, target: string) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/api") || pathname.startsWith("/_next")) {
    return updateSession(request);
  }

  return NextResponse.redirect(
    new URL(`${pathname}${search}`, `https://${target}`),
    301,
  );
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (GOOGLE_VERIFICATION_RE.test(pathname)) {
    return updateSession(request);
  }

  const host = request.headers.get("host");
  const resolution = resolveHost(host);
  if (resolution.kind === "tenant") {
    return proxyTenantHost(request, resolution.slug);
  }

  // The platform domain itself (and any reserved label under it, e.g. www).
  // No rewrite: served as-is, straight to app/(platform)/** — phase C4. This
  // is what stops the apex still quietly serving the primary tenant now that
  // it has a landing page of its own.
  if (resolution.kind === "platform") {
    return updateSession(request);
  }

  const normalized = normalizeHost(host);
  const legacy = publicEnv.legacyHostRedirects.find(([from]) => from === normalized);
  if (legacy) {
    return proxyLegacyHost(request, legacy[1]);
  }

  // ── Everything below is the pre-C1 path-based behaviour, unchanged ──────
  // Reached only by "unknown" hosts now — the vercel.app deployment host and
  // localhost. Both still serve the primary tenant at bare paths; the
  // platform domain stopped taking this branch the moment it got a landing
  // page of its own, above.

  if (!isGlobalPath(pathname)) {
    // The primary tenant is canonical at the bare path, so its prefixed form
    // redirects rather than serving the same page at a second URL.
    if (pathname === `/s/${PRIMARY}` || pathname.startsWith(`/s/${PRIMARY}/`)) {
      const bare = pathname.slice(`/s/${PRIMARY}`.length) || "/";
      return NextResponse.redirect(new URL(`${bare}${search}`, request.url), 301);
    }

    if (isTenantPath(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = `/s/${PRIMARY}${pathname === "/" ? "" : pathname}`;
      // Rewritten, but still session-refreshed: an admin browsing their own
      // public site must not quietly fall out of their session.
      return updateSession(request, () => NextResponse.rewrite(url));
    }
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif)$).*)",
  ],
};
