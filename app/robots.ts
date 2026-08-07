import type { MetadataRoute } from "next";

import { getTenantForRequestHost } from "@/lib/host-tenant";
import { tenantSiteUrl } from "@/lib/tenant";
import { publicEnv } from "@/lib/env";

/**
 * Per-host, for one reason: the Sitemap line has to name the host robots.txt
 * was fetched from. Pointing every host at one sitemap is how deogharbnb
 * .space ended up advertising kailasha-stays.vercel.app's sitemap.
 */
export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const tenant = await getTenantForRequestHost();
  const base = tenant ? tenantSiteUrl(tenant) : publicEnv.siteUrl;

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/superadmin", "/stay", "/api"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
