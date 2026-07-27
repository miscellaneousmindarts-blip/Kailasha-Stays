import type { MetadataRoute } from "next";

import { listPropertiesForSitemap } from "@/lib/queries";
import { publicEnv } from "@/lib/env";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = publicEnv.siteUrl;
  const properties = await listPropertiesForSitemap();

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
