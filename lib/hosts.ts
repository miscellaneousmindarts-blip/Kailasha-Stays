import { publicEnv } from "@/lib/env";

/**
 * Maps an incoming Host header to what it is: one tenant's site, the
 * platform itself, or something this app doesn't recognise.
 *
 * ── Why this is pure string work, with no database call ──────────────────
 *
 * It runs in the proxy, on every single request. A lookup here would put a
 * network round trip in front of every page load, including static assets.
 *
 * It doesn't need one: `{slug}.{platformDomain}` carries the slug in the
 * hostname, and `/s/[tenant]/layout.tsx` already resolves that slug against
 * the database and 404s an unknown or non-active tenant. So an invented
 * subdomain costs a rewrite and then a 404 from the layout — the same answer
 * a lookup here would have given, one layer later and for free.
 *
 * Custom domains (a host with no derivable slug) are the one case that will
 * genuinely need a lookup. They attach at the `unknown` branch, and they are
 * the rare host rather than every host.
 */

/**
 * Labels that must never resolve to a tenant, whatever the tenants table
 * says. `www` is the load-bearing one — a tenant with that slug would take
 * the platform's own site down — but every entry here is a hostname somebody
 * eventually points at infrastructure.
 *
 * Enforced twice on purpose: here, so a bad row can't route; and at tenant
 * creation, so the bad row can't be written in the first place.
 */
export const RESERVED_LABELS = new Set([
  "www",
  "admin",
  "superadmin",
  "api",
  "app",
  "auth",
  "assets",
  "static",
  "cdn",
  "mail",
  "smtp",
  "ftp",
  "blog",
  "docs",
  "help",
  "support",
  "status",
  "staging",
  "dev",
  "test",
  "preview",
  "stay",
  "portal",
]);

/** Mirrors the slug CHECK constraint on public.tenants (0011_tenants.sql). */
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export type HostResolution =
  /** A tenant's own site. `slug` still has to exist and be active. */
  | { kind: "tenant"; slug: string }
  /** A platform domain itself, or a reserved label under one (www, admin…). */
  | { kind: "platform"; domain: string }
  /**
   * Everything else: the vercel.app deployment host, localhost, preview
   * URLs, and — later — customer-supplied custom domains. Treated as the
   * legacy path-based site, which is exactly what those hosts serve today.
   */
  | { kind: "unknown" };

/** Strips the port and normalises case, so `Host` comparisons can be exact. */
export function normalizeHost(host: string | null | undefined): string {
  if (!host) return "";
  return host.split(":")[0].trim().toLowerCase();
}

export function isReservedLabel(label: string): boolean {
  return RESERVED_LABELS.has(label.toLowerCase());
}

export function resolveHost(rawHost: string | null | undefined): HostResolution {
  const host = normalizeHost(rawHost);
  if (!host) return { kind: "unknown" };

  for (const domain of publicEnv.platformDomains) {
    if (host === domain) return { kind: "platform", domain };

    const suffix = `.${domain}`;
    if (!host.endsWith(suffix)) continue;

    const label = host.slice(0, -suffix.length);

    // Exactly one label deep. `a.b.deogharbnb.space` is not tenant `a` — it
    // is a host nobody configured, and guessing at it would route a visitor
    // into a tenant's site through an address that tenant never published.
    if (!label || label.includes(".")) return { kind: "unknown" };

    if (isReservedLabel(label)) return { kind: "platform", domain };
    if (!SLUG_RE.test(label)) return { kind: "unknown" };

    return { kind: "tenant", slug: label };
  }

  return { kind: "unknown" };
}

/**
 * The subdomain a tenant would get by default under the first configured
 * platform domain. A *proposal*, not the answer — where a tenant's site
 * actually is canonical is `tenants.canonical_host`, and until that column
 * is set the tenant is still served the old way. See lib/tenant.ts.
 */
export function defaultTenantHost(slug: string): string | null {
  const domain = publicEnv.platformDomains[0];
  return domain ? `${slug}.${domain}` : null;
}
