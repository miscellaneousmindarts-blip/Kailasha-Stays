import { cache } from "react";

import { createPublicClient } from "@/lib/supabase/public";
import { publicEnv } from "@/lib/env";

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
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", publicEnv.primaryTenantSlug)
    .eq("status", "active")
    .maybeSingle();

  return data?.id ?? null;
});
