import "server-only";

import { headers } from "next/headers";

import { resolveHost } from "@/lib/hosts";
import { getTenantBySlug, type PublicTenant } from "@/lib/tenant";
import { publicEnv } from "@/lib/env";

/**
 * The tenant whose site the *current request's hostname* belongs to.
 *
 * Deliberately used by only two routes — sitemap.xml and robots.txt — and
 * never by a page. Both must answer for the host they were fetched on: a
 * sitemap listing another host's URLs is worse than no sitemap, and
 * robots.txt has to point at its own host's sitemap.
 *
 * It calls headers(), which opts the caller into dynamic rendering. That is
 * why it lives here behind an explicit import rather than inside
 * lib/tenant.ts, where a page could reach for it by accident and silently
 * drop that page — and every page under it — out of static generation.
 *
 * Null on the platform domain itself (phase C4) — it is not any tenant's
 * site, and had it kept falling back to the primary tenant here, its
 * sitemap.xml and robots.txt would have gone on advertising a DIFFERENT
 * site's URLs as their own, which is worse than the empty/generic answer
 * sitemap.ts and robots.ts each already fall back to for null.
 *
 * Still falls back to the primary tenant for the vercel.app host and
 * localhost — that is exactly what those hosts serve today (only the
 * platform domain got its own identity in C4).
 */
export async function getTenantForRequestHost(): Promise<PublicTenant | null> {
  const host = (await headers()).get("host");
  const resolution = resolveHost(host);

  if (resolution.kind === "tenant") return getTenantBySlug(resolution.slug);
  if (resolution.kind === "platform") return null;

  return getTenantBySlug(publicEnv.primaryTenantSlug);
}
