import { cache } from "react";

import { createPublicClient } from "@/lib/supabase/public";
import { publicEnv } from "@/lib/env";
import type { Tenant } from "@/lib/types/database";

export type PublicTenant = Pick<Tenant, "id" | "slug" | "name" | "status">;

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
    const { data } = await supabase
      .from("tenants")
      .select("id,slug,name,status")
      .eq("slug", slug)
      .eq("status", "active")
      .maybeSingle();

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
 * Every active tenant's slug, for generateStaticParams.
 *
 * Without this the [tenant] segment has no known values at build time and
 * every page under it silently drops from static/ISR to fully dynamic — the
 * kind of regression that shows up as a hosting bill rather than an error.
 */
export async function listActiveTenantSlugs(): Promise<string[]> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("tenants")
    .select("slug")
    .eq("status", "active");
  return (data ?? []).map((t) => t.slug);
}

/**
 * Prefix for links within a tenant's site: "" for the tenant served at the
 * bare domain, "/s/{slug}" for everyone else.
 *
 * The empty string for the primary tenant is what keeps every existing
 * indexed URL — kailasha-stays.vercel.app/properties/x — byte-identical
 * through this migration. It is also why links have to be built through this
 * helper rather than hardcoded: an absolute "/properties" on tenant B's page
 * would silently navigate the visitor to tenant A's site.
 */
export function tenantBasePath(tenantSlug: string): string {
  return tenantSlug === publicEnv.primaryTenantSlug ? "" : `/s/${tenantSlug}`;
}
