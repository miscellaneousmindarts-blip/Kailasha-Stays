import { cache } from "react";

import { createPublicClient } from "@/lib/supabase/public";
import { publicEnv } from "@/lib/env";
import type { Tenant } from "@/lib/types/database";

export type PublicTenant = Pick<
  Tenant,
  "id" | "slug" | "name" | "status" | "canonical_host" | "plan"
>;

/**
 * The minimum a caller needs to address a tenant's site. Everything that
 * builds a URL takes this rather than a slug string, because the slug alone
 * stopped being enough the moment a tenant could live on its own host.
 */
export type TenantAddress = Pick<Tenant, "slug" | "canonical_host">;

/**
 * A tenant by its public slug, for rendering that tenant's site.
 *
 * Only `active` tenants resolve. A suspended or cancelled tenant's public
 * site must stop serving — that is the whole leverage behind the payment
 * gate in phase B7, and it belongs here rather than in each page, so there
 * is no route that can accidentally keep serving an unpaid site.
 *
 * `cache` de-duplicates this across a render pass — the layout and the page
 * both resolve the tenant without a second round trip.
 */
export const getTenantBySlug = cache(
  async (slug: string): Promise<PublicTenant | null> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("tenants")
      .select("id,slug,name,status,canonical_host,plan")
      .eq("slug", slug)
      .eq("status", "active")
      .maybeSingle();

    // A failed *query* is not the same answer as "no such tenant", and
    // conflating them is expensive here: every public page resolves its
    // tenant through this, so one bad column name would 404 every site at
    // once while looking exactly like a legitimately unknown slug. Matches
    // how getProperty() in lib/queries.ts already treats its errors.
    if (error) throw new Error(`Could not resolve tenant "${slug}": ${error.message}`);

    return data ?? null;
  },
);

/**
 * The tenant served at the bare domain.
 *
 * Still needed after B3b for the routes that are NOT under /s/[tenant] —
 * /stay/[token] (a booking link that predates tenants and must keep working
 * unprefixed) and the apex sitemap. Public pages under /s/[tenant] resolve
 * their tenant from the URL and must not call this.
 */
export const getPrimaryTenantId = cache(async (): Promise<string | null> => {
  const tenant = await getTenantBySlug(publicEnv.primaryTenantSlug);
  return tenant?.id ?? null;
});

/**
 * Every active, branded tenant's slug, for generateStaticParams under
 * /s/[tenant]/**.
 *
 * Without this the [tenant] segment has no known values at build time and
 * every page under it silently drops from static/ISR to fully dynamic — the
 * kind of regression that shows up as a hosting bill rather than an error.
 *
 * Excludes 'listing' (Plan A) tenants: their /s/{slug} route 404s (see
 * app/(public)/s/[tenant]/layout.tsx), so prerendering it would build a page
 * that only ever serves a 404.
 */
export async function listActiveTenantSlugs(): Promise<string[]> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("tenants")
    .select("slug")
    .eq("status", "active")
    .eq("plan", "branded");
  return (data ?? []).map((t) => t.slug);
}

/**
 * ── Addressing a tenant's site ───────────────────────────────────────────
 *
 * Three helpers, and the whole of phase C hangs off which branch they take.
 *
 * A tenant with `canonical_host` set lives on its own hostname, so its links
 * are bare and its absolute URLs name that host. A tenant without one is
 * still served the old way — at NEXT_PUBLIC_SITE_URL, under /s/{slug},
 * except for the primary tenant which sits at the bare path there.
 *
 * They move together on purpose. Bare links only resolve correctly on the
 * tenant's own host, so a tenant that had `canonical_host` set for its
 * canonical tag but not for its links would emit links that 404 for every
 * visitor arriving the old way. One column, one switch, all three answers.
 */

/** Prefix for internal links within a tenant's site. */
export function tenantBasePath(tenant: TenantAddress): string {
  if (tenant.canonical_host) return "";
  return tenant.slug === publicEnv.primaryTenantSlug ? "" : `/s/${tenant.slug}`;
}

/** Scheme + host to build absolute URLs against (canonical tags, sitemap, OG). */
export function tenantOrigin(tenant: TenantAddress): string {
  return tenant.canonical_host
    ? `https://${tenant.canonical_host}`
    : publicEnv.siteUrl;
}

/** Absolute URL of the root of this tenant's site, with no trailing slash. */
export function tenantSiteUrl(tenant: TenantAddress): string {
  return `${tenantOrigin(tenant)}${tenantBasePath(tenant)}`;
}
