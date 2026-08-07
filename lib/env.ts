/**
 * Central place for environment access.
 *
 * Anything read here that is NOT prefixed with NEXT_PUBLIC_ must only ever be
 * imported from server-side code. `serverEnv` is guarded so an accidental
 * client import fails loudly at build time instead of leaking a secret.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.local.example to .env.local and fill it in.`,
    );
  }
  return value;
}

export const publicEnv = {
  supabaseUrl: required(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  ),
  supabaseAnonKey: required(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  ),
  // NOTE: the WhatsApp number and contact details are NOT read from the
  // environment — they live in the site_settings table so the admin can change
  // them without a redeploy. See lib/settings.ts.
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  /**
   * Which tenant the public site resolves to until phase B3 gives every
   * request a real resolved tenant (from a /s/{slug} path, then a subdomain).
   * Until then every public page effectively has exactly one answer to
   * "whose site is this", and this is where that answer lives. See
   * lib/tenant.ts.
   */
  primaryTenantSlug: process.env.NEXT_PUBLIC_PRIMARY_TENANT_SLUG || "kailasha-stays",
  /**
   * Domains under which a tenant is reachable at {slug}.{domain}.
   *
   * A LIST, not a constant, from the very first commit that uses it — adding
   * a second platform domain later is then a config change rather than a
   * refactor of every place that asks "is this host one of ours".
   */
  platformDomains: (process.env.NEXT_PUBLIC_PLATFORM_DOMAINS ?? "")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean),
  /**
   * The single host that serves /admin and /superadmin.
   *
   * Deliberately one host for all tenants: per-subdomain admin would need an
   * auth cookie scoped to the parent domain, which the browser then attaches
   * to EVERY tenant subdomain — one compromised tenant site would receive
   * other operators' sessions. See docs/saas-multi-tenant-plan.md, C1.
   */
  adminHost: (process.env.NEXT_PUBLIC_ADMIN_HOST ?? "").trim().toLowerCase(),
  /**
   * Hosts a tenant used to live on, as `oldhost>newhost` pairs. Everything
   * on the old host 301s to the same path on the new one — except /api, for
   * reasons that cost real money if forgotten. See proxy.ts.
   *
   * Kept as config rather than derived from the tenant row because the proxy
   * has no database, and because "where did this host used to point" is
   * history, not something a current tenant row can answer.
   */
  legacyHostRedirects: (process.env.NEXT_PUBLIC_LEGACY_HOST_REDIRECTS ?? "")
    .split(",")
    .map((pair) => pair.split(">").map((h) => h.trim().toLowerCase()))
    .filter((pair): pair is [string, string] => pair.length === 2 && Boolean(pair[0] && pair[1])),
};

export const serverEnv = {
  get serviceRoleKey() {
    if (typeof window !== "undefined") {
      throw new Error("serverEnv.serviceRoleKey must never be read on the client");
    }
    return required(
      "SUPABASE_SERVICE_ROLE_KEY",
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );
  },
  get icalExportSecret() {
    if (typeof window !== "undefined") {
      throw new Error("serverEnv.icalExportSecret must never be read on the client");
    }
    return required("ICAL_EXPORT_SECRET", process.env.ICAL_EXPORT_SECRET);
  },
  /**
   * Google Static Maps key for the landing-page map. Optional — without it
   * the map strip falls back to a plain numbered list.
   *
   * This key ends up visible in the rendered <img> src, which is normal and
   * unavoidable for Static Maps. Restrict it by HTTP referrer in the Google
   * Cloud console; that, not secrecy, is what stops someone else billing you.
   */
  get googleMapsStaticKey(): string | null {
    if (typeof window !== "undefined") return null;
    return process.env.GOOGLE_MAPS_STATIC_KEY || null;
  },
  /** Authorizes the scheduled calendar-sync route (pg_cron -> pg_net -> this route). */
  get cronSecret() {
    if (typeof window !== "undefined") {
      throw new Error("serverEnv.cronSecret must never be read on the client");
    }
    return required("CRON_SECRET", process.env.CRON_SECRET);
  },
};
