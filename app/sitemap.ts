import type { MetadataRoute } from "next";

import { listPropertiesForSitemap } from "@/lib/queries";
import { getTenantForRequestHost } from "@/lib/host-tenant";
import { tenantSiteUrl } from "@/lib/tenant";

/**
 * Per-host: {slug}.deogharbnb.space/sitemap.xml lists that tenant's pages at
 * that tenant's URLs. Anything else falls back to the primary tenant, which
 * is what the apex and the vercel.app host serve.
 *
 * Dynamic rather than static because it reads the request's host. That is a
 * fair trade for two crawler-facing routes; the property pages that actually
 * carry traffic stay statically generated.
 */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const tenant = await getTenantForRequestHost();
  if (!tenant) return [];

  const base = tenantSiteUrl(tenant);
  const properties = await listPropertiesForSitemap(tenant.id);

  return [
    { url: base, changeFrequency: "monthly", priority: 1 },
    { url: `${base}/properties`, changeFrequency: "weekly", priority: 0.9 },
    ...properties.map((p) => ({
      url: `${base}/properties/${p.slug}`,
      lastModified: p.updated_at,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
