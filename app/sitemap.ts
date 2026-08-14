import type { MetadataRoute } from "next";

import { listPropertiesForSitemap } from "@/lib/queries";
import { listListingPlanPropertiesForSitemap } from "@/lib/platform";
import { getTenantForRequestHost, isPlatformRequestHost } from "@/lib/host-tenant";
import { tenantSiteUrl } from "@/lib/tenant";
import { PLATFORM_SITE_URL } from "@/lib/platform-content";

/**
 * Per-host: {slug}.deogharbnb.space/sitemap.xml lists that tenant's pages at
 * that tenant's URLs. The platform host itself (0027,
 * docs/tenant-plans-plan.md §7.2) gets the apex homepage plus
 * /stays/{public_slug} for 'listing' (Plan A) properties ONLY — a 'branded'
 * tenant's property already has a sitemap entry on their own tenant site,
 * where the property page stays canonical; listing it here too would point
 * a crawler at a URL that immediately canonical-redirects away from itself.
 * Anything else (vercel.app, localhost) falls back to the primary tenant.
 *
 * Dynamic rather than static because it reads the request's host. That is a
 * fair trade for two crawler-facing routes; the property pages that actually
 * carry traffic stay statically generated.
 */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (await isPlatformRequestHost()) {
    const properties = await listListingPlanPropertiesForSitemap();
    return [
      { url: PLATFORM_SITE_URL, changeFrequency: "monthly", priority: 1 },
      ...properties.map((p) => ({
        url: `${PLATFORM_SITE_URL}/stays/${p.public_slug}`,
        lastModified: p.updated_at,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
    ];
  }

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
