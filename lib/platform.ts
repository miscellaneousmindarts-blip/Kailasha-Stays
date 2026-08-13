import "server-only";
import { cache } from "react";

import { createPublicClient } from "@/lib/supabase/public";
import { templeDistance, travelTime, type LandingDistance } from "@/lib/landing";
import type { PropertyImage } from "@/lib/types/database";

export type PlatformProperty = {
  id: string;
  slug: string;
  title: string;
  sleeps: number;
  bedrooms: number;
  bathrooms: number;
  ratePerNight: number | null;
  currency: string;
  amenities: string[];
  images: Pick<PropertyImage, "storage_path" | "alt" | "is_cover">[];
  /** "/s/{slug}" — always the path form; see proxy.ts, it serves unrewritten
   *  regardless of whether the tenant also has its own subdomain. */
  basePath: string;
  /** The PERSON's name ("Kamal Kishan"), from site_settings.host_name — not
   *  business_name ("Kailasha Stays"). "Hosted by Kailasha Stays" reads like
   *  a company; "Hosted by Kamal Kishan" is the thing that makes this a
   *  network of real local families rather than a listings aggregator,
   *  which is the entire point of naming the host on each card. Falls back
   *  to business_name only for a tenant that hasn't set host_name yet — a
   *  business-name fallback beats no attribution at all. */
  hostName: string;
  distanceFromTemple: LandingDistance | null;
  /** Parsed minutes from distanceFromTemple's "…15 min walk" tail, when the
   *  travel mode is walking — used for §S6a's computed promise and the
   *  "walk to temple" filter chip. Null for a property with no temple
   *  distance, or one measured by cab/car rather than on foot. */
  walkMinutes: number | null;
  airbnb: { url: string; rating: number | null; reviewCount: number | null } | null;
};

type Row = {
  id: string;
  slug: string;
  title: string;
  max_guests: number;
  bedrooms: number;
  bathrooms: number;
  base_price: number | null;
  currency: string;
  amenities: string[] | null;
  property_images:
    | (Pick<PropertyImage, "storage_path" | "alt" | "is_cover"> & { sort_order: number })[]
    | null;
  property_sections:
    | { type: string; content: unknown; visible: boolean; audience: string }[]
    | null;
  tenants:
    | {
        slug: string;
        status: string;
        site_settings: { business_name: string; host_name: string | null } | null;
      }
    | null;
  // booking_channels(*) via wildcard so this query never breaks if
  // rating/review_count/ratings_checked_at (0026) haven't been applied yet —
  // those fields are simply absent from the row until the migration runs,
  // and this reads them defensively below rather than naming them in select().
  booking_channels: Record<string, unknown>[] | null;
};

/** Same two-source read as lib/landing.ts's readDistances(), inlined here
 *  because that one filters to a single tenant's own property_sections shape
 *  — this reads the same content across tenants from a slightly different
 *  select shape (no `title` needed, since only the `distances` block type is
 *  read here, never the key_value fallback a title match would require). */
function readTempleDistance(
  sections: Row["property_sections"],
): LandingDistance | null {
  const items: LandingDistance[] = [];
  for (const section of sections ?? []) {
    if (section.type !== "distances" || !section.visible || section.audience === "guest") continue;
    const content = section.content as { items?: { label?: string; value?: string }[] };
    for (const item of content?.items ?? []) {
      const label = item.label?.trim();
      const value = item.value?.trim();
      if (label && value) items.push({ label, value });
    }
  }
  return templeDistance(items);
}

/** "15 min walk" → 15. Null for any other unit ("min by auto", "hr by car") —
 *  those aren't a walk time and shouldn't be treated as one. */
function parseWalkMinutes(distance: LandingDistance | null): number | null {
  const time = travelTime(distance);
  if (!time || !/walk/i.test(time)) return null;
  const match = time.match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

/**
 * Every published property across every active tenant, sorted by temple
 * distance ascending (the field guests actually rank on) with sort_order as
 * the tiebreak. This is what makes deogharbnb.space a network rather than a
 * mirror of any one tenant's own /properties page.
 *
 * Cross-tenant reads already work for the anon key — properties_public_read
 * (0013) is `status = 'published'` with no tenant condition — so this is one
 * query, not N.
 */
export const getPlatformProperties = cache(async (): Promise<PlatformProperty[]> => {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("properties")
    .select(
      `id, slug, title, max_guests, bedrooms, bathrooms, base_price, currency, amenities, sort_order,
       property_images(storage_path, alt, is_cover, sort_order),
       property_sections(type, content, visible, audience),
       tenants!inner(slug, status, site_settings(business_name, host_name)),
       booking_channels(*)`,
    )
    .eq("status", "published")
    .eq("tenants.status", "active");

  if (error) throw new Error(`Could not load platform properties: ${error.message}`);

  const rows = (data ?? []) as unknown as (Row & { sort_order: number })[];

  const properties: PlatformProperty[] = rows.map((row) => {
    const images = [...(row.property_images ?? [])].sort(
      (a, b) => Number(b.is_cover) - Number(a.is_cover) || a.sort_order - b.sort_order,
    );

    const distance = readTempleDistance(row.property_sections);

    const activeAirbnb = (row.booking_channels ?? []).find(
      (c) => c.active && (c.slug === "airbnb" || /airbnb/i.test(String(c.name ?? ""))),
    );
    const airbnb =
      activeAirbnb && typeof activeAirbnb.booking_url === "string" && activeAirbnb.booking_url
        ? {
            url: activeAirbnb.booking_url,
            rating: typeof activeAirbnb.rating === "number" ? activeAirbnb.rating : null,
            reviewCount:
              typeof activeAirbnb.review_count === "number" ? activeAirbnb.review_count : null,
          }
        : null;

    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      sleeps: row.max_guests,
      bedrooms: row.bedrooms,
      bathrooms: row.bathrooms,
      ratePerNight: row.base_price,
      currency: row.currency,
      amenities: row.amenities ?? [],
      images,
      basePath: `/s/${row.tenants?.slug ?? ""}`,
      hostName:
        row.tenants?.site_settings?.host_name ??
        row.tenants?.site_settings?.business_name ??
        row.tenants?.slug ??
        "",
      distanceFromTemple: distance,
      walkMinutes: parseWalkMinutes(distance),
      airbnb,
    };
  });

  // Closest to the temple leads — the fact guests actually rank homes on.
  // A property with no parsed distance sorts last rather than first, since
  // "unknown" should never outrank a home that stated a real number.
  properties.sort((a, b) => {
    const aMin = a.walkMinutes ?? Number.POSITIVE_INFINITY;
    const bMin = b.walkMinutes ?? Number.POSITIVE_INFINITY;
    if (aMin !== bMin) return aMin - bMin;
    return rows.findIndex((r) => r.id === a.id) - rows.findIndex((r) => r.id === b.id);
  });

  return properties;
});
