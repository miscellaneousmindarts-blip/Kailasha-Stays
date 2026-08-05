import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";
import { publicEnv } from "@/lib/env";

/**
 * Two jobs, in this order:
 *
 *   1. Map an incoming URL to the tenant whose site it belongs to.
 *   2. Refresh the Supabase auth cookie (Server Components can't write
 *      cookies, so without this a session would silently expire mid-visit).
 *
 * ── On the tenant mapping ────────────────────────────────────────────────
 *
 * Public pages live at /s/{tenant}/... internally. The primary tenant is
 * ALSO served at the bare domain, and that is not a convenience — every
 * indexed URL on kailasha-stays.vercel.app is a bare one, so the apex has to
 * keep answering exactly as it did. That is why it is a REWRITE (the URL the
 * visitor and Google see never changes) and not a redirect.
 *
 * The prefixed form of the primary tenant then has to go away, or the same
 * page would be reachable at two URLs and split its own ranking. So
 * /s/{primary}/... 301s to the bare path. That cannot loop: the rewrite is
 * internal and never re-enters the proxy, and the redirect strips the very
 * prefix that triggers it.
 *
 * When a real domain arrives (B10), subdomain and custom-domain resolution
 * slot in as extra branches here — the route tree and everything downstream
 * already speak /s/{tenant}, so nothing else has to move.
 */

const PRIMARY = publicEnv.primaryTenantSlug;

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

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

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
