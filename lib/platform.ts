import "server-only";
import { cache } from "react";

import { createPublicClient } from "@/lib/supabase/public";
import { templeDistance, travelTime, type LandingDistance } from "@/lib/landing";
import { PUBLIC_CHANNEL_COLUMNS, type PublicBookingChannel } from "@/lib/queries";
import type {
  Property,
  PropertyImage,
  PropertySection,
  RatePeriod,
} from "@/lib/types/database";

export type PlatformProperty = {
  id: string;
  slug: string;
  /** The apex address: /stays/{publicSlug}. Globally unique, unlike `slug`
   *  (only unique per tenant) — see 0027_tenant_plans.sql. */
  publicSlug: string;
  title: string;
  sleeps: number;
  bedrooms: number;
  bathrooms: number;
  ratePerNight: number | null;
  currency: string;
  amenities: string[];
  images: Pick<PropertyImage, "storage_path" | "alt" | "is_cover">[];
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
  public_slug: string;
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
      `id, slug, public_slug, title, max_guests, bedrooms, bathrooms, base_price, currency, amenities, sort_order,
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
      publicSlug: row.public_slug,
      title: row.title,
      sleeps: row.max_guests,
      bedrooms: row.bedrooms,
      bathrooms: row.bathrooms,
      ratePerNight: row.base_price,
      currency: row.currency,
      amenities: row.amenities ?? [],
      images,
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

/**
 * One property's full record, addressed by its globally-unique public_slug —
 * for /stays/[slug] (docs/tenant-plans-plan.md §3), the apex's own property
 * page. Every field the tenant property page needs (§3 of that doc: gallery,
 * sections, amenities, map, booking card) plus what the apex page needs that
 * the tenant page gets from its own layout instead — host name, WhatsApp
 * number, check-in/out defaults — since this page has no SiteHeader/
 * SiteFooter and must not read business_name, logo_path or brand_color from
 * site_settings (that would leak the owner's branding onto a page that is
 * deliberately Deoghar BnB's, not theirs).
 */
export type PlatformPropertyDetail = Property & {
  property_images: PropertyImage[];
  property_sections: PropertySection[];
  rate_periods: RatePeriod[];
  booking_channels: PublicBookingChannel[];
  tenant: {
    slug: string;
    plan: "listing" | "branded";
    /** For the canonical tag (§7.1): a branded tenant's apex page points
     *  its canonical at their own site instead of at itself. */
    canonicalHost: string | null;
  };
  hostName: string;
  whatsappNumber: string | null;
  defaultCheckInTime: string;
  defaultCheckOutTime: string;
};

type DetailRow = Property & {
  property_images: PropertyImage[];
  property_sections: PropertySection[];
  rate_periods: RatePeriod[];
  booking_channels: PublicBookingChannel[];
  tenants: {
    slug: string;
    plan: "listing" | "branded";
    canonical_host: string | null;
    status: string;
    site_settings: {
      host_name: string | null;
      business_name: string;
      whatsapp_number: string | null;
      default_check_in_time: string;
      default_check_out_time: string;
    } | null;
  } | null;
};

export const getPlatformPropertyByPublicSlug = cache(
  async (publicSlug: string): Promise<PlatformPropertyDetail | null> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("properties")
      .select(
        `*, property_images(*), property_sections(*), rate_periods(*), booking_channels(${PUBLIC_CHANNEL_COLUMNS}),
         tenants!inner(slug, plan, canonical_host, status, site_settings(host_name, business_name, whatsapp_number, default_check_in_time, default_check_out_time))`,
      )
      .eq("public_slug", publicSlug)
      .eq("status", "published")
      .eq("tenants.status", "active")
      .maybeSingle();

    if (error) throw new Error(`Could not load property "${publicSlug}": ${error.message}`);
    if (!data) return null;

    const row = data as unknown as DetailRow;
    const settings = row.tenants?.site_settings;

    return {
      ...row,
      property_images: [...(row.property_images ?? [])].sort(
        (a, b) => Number(b.is_cover) - Number(a.is_cover) || a.sort_order - b.sort_order,
      ),
      property_sections: [...(row.property_sections ?? [])].sort(
        (a, b) => a.sort_order - b.sort_order,
      ),
      rate_periods: [...(row.rate_periods ?? [])].sort((a, b) =>
        a.start_date.localeCompare(b.start_date),
      ),
      booking_channels: [...(row.booking_channels ?? [])].sort(
        (a, b) => a.sort_order - b.sort_order,
      ),
      tenant: {
        slug: row.tenants?.slug ?? "",
        plan: row.tenants?.plan ?? "listing",
        canonicalHost: row.tenants?.canonical_host ?? null,
      },
      hostName: settings?.host_name ?? settings?.business_name ?? row.tenants?.slug ?? "",
      whatsappNumber: settings?.whatsapp_number ?? null,
      defaultCheckInTime: settings?.default_check_in_time ?? "13:00",
      defaultCheckOutTime: settings?.default_check_out_time ?? "11:00",
    };
  },
);

/**
 * Every published property's public_slug, across BOTH plans — what
 * /stays/[slug]'s generateStaticParams needs. Unlike
 * lib/queries.ts's listPublishedPropertyPaths() (branded tenants only, for
 * /s/[tenant]/**), the apex property page is exactly where a 'listing'
 * (Plan A) tenant's properties are meant to be reachable, so this
 * deliberately does not filter by plan.
 */
export async function listPlatformPropertyPublicSlugs(): Promise<string[]> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("properties")
    .select("public_slug, tenants!inner(status)")
    .eq("status", "published")
    .eq("tenants.status", "active");
  return (data ?? []).map((p) => p.public_slug);
}

/**
 * 'listing' (Plan A) properties only, for the apex's own sitemap.xml (0027,
 * docs/tenant-plans-plan.md §7.2). A 'branded' tenant's property already
 * appears in THEIR OWN tenant sitemap (lib/queries.ts's
 * listPropertiesForSitemap()) and their page stays canonical there — listing
 * it a second time here, where /stays/[slug] itself points its canonical
 * tag AWAY at that other page, would tell a crawler to index a URL that
 * immediately disclaims itself.
 */
export async function listListingPlanPropertiesForSitemap(): Promise<
  { public_slug: string; updated_at: string }[]
> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("properties")
    .select("public_slug, updated_at, tenants!inner(status, plan)")
    .eq("status", "published")
    .eq("tenants.status", "active")
    .eq("tenants.plan", "listing");
  return (data ?? []).map((p) => ({ public_slug: p.public_slug, updated_at: p.updated_at }));
}
