import { cache } from "react";

import { createPublicClient } from "@/lib/supabase/public";
import { publicEnv } from "@/lib/env";
import type { Tenant } from "@/lib/types/database";

/**
 * Resolves the one tenant every public page renders today.
 *
 * This is a placeholder for phase B3's real per-request resolution
 * (/s/{slug} path, later a subdomain) — until that lands, every request to
 * the public site is implicitly "for" whichever tenant publicEnv.primaryTenantSlug
 * names. Every public query that needs a tenant_id (site_settings today;
 * properties/homepage_sections/addon_services from B3 on) should call this
 * rather than assume a global default, so replacing it in one place in B3
 * fixes every caller at once.
 *
 * `cache` de-duplicates this across a render pass — several components on one
 * page can call it without extra round trips.
 */
export const getPrimaryTenantId = cache(async (): Promise<string | null> => {
  const tenant = await getTenantBySlug(publicEnv.primaryTenantSlug);
  return tenant?.id ?? null;
});

export type PublicTenant = Pick<Tenant, "id" | "slug" | "name" | "status">;

/**
 * A tenant by its public slug, for rendering that tenant's site.
 *
 * Only `active` tenants resolve. A suspended or cancelled tenant's public
 * site must stop serving — that is the whole leverage behind the payment
 * gate in phase B7, and it belongs here rather than in each page, so there
 * is no route that can accidentally keep serving an unpaid site.
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
