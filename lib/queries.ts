import { cache } from "react";

import { createPublicClient } from "@/lib/supabase/public";
import type {
  AddonService,
  Property,
  PropertyImage,
  PropertySection,
  RatePeriod,
} from "@/lib/types/database";

export type PropertyCardData = Pick<
  Property,
  | "id"
  | "slug"
  | "title"
  | "summary"
  | "area"
  | "city"
  | "max_guests"
  | "bedrooms"
  | "bathrooms"
  | "base_price"
  | "currency"
  | "property_type"
> & { property_images: Pick<PropertyImage, "storage_path" | "alt" | "is_cover">[] };

export type PropertyDetail = Property & {
  property_images: PropertyImage[];
  property_sections: PropertySection[];
  rate_periods: RatePeriod[];
};

/**
 * Published properties for the /properties grid, in the admin's chosen order.
 *
 * tenant_id is filtered here rather than left to RLS on purpose: the public
 * read policy is `status = 'published'` with no tenant condition, because RLS
 * cannot know which tenant an anonymous request is *for*. That answer comes
 * from the URL, so scoping is the query layer's job — see lib/tenant.ts.
 */
export const listProperties = cache(
  async (tenantId: string): Promise<PropertyCardData[]> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("properties")
      .select(
        "id, slug, title, summary, area, city, max_guests, bedrooms, bathrooms, base_price, currency, property_type, property_images(storage_path, alt, is_cover)",
      )
      .eq("tenant_id", tenantId)
      .eq("status", "published")
      .order("sort_order")
      .order("created_at");

    if (error) throw new Error(`Could not load properties: ${error.message}`);
    return (data ?? []) as PropertyCardData[];
  },
);

/**
 * One property with its photos and public sections.
 * RLS already filters sections to visible + public/both for anon callers.
 */
export const getProperty = cache(
  async (tenantId: string, slug: string): Promise<PropertyDetail | null> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("properties")
      .select("*, property_images(*), property_sections(*), rate_periods(*)")
      .eq("tenant_id", tenantId)
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();

    if (error) throw new Error(`Could not load property: ${error.message}`);
    if (!data) return null;

    const property = data as PropertyDetail;
    property.rate_periods = [...(property.rate_periods ?? [])].sort((a, b) =>
      a.start_date.localeCompare(b.start_date),
    );
    property.property_images = [...(property.property_images ?? [])].sort(
      (a, b) =>
        Number(b.is_cover) - Number(a.is_cover) || a.sort_order - b.sort_order,
    );
    property.property_sections = [...(property.property_sections ?? [])].sort(
      (a, b) => a.sort_order - b.sort_order,
    );
    return property;
  },
);

export type AddonServiceData = Pick<
  AddonService,
  "id" | "name" | "description" | "price" | "price_unit"
>;

/** Active add-ons this property has been switched on for, from the shared catalog. */
export const getAddonsForProperty = cache(
  async (propertyId: string): Promise<AddonServiceData[]> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("property_addon_services")
      .select(
        "addon_services!inner(id, name, description, price, price_unit, active, sort_order)",
      )
      .eq("property_id", propertyId)
      .eq("addon_services.active", true)
      .order("sort_order", { referencedTable: "addon_services" });

    if (error) throw new Error(`Could not load add-ons: ${error.message}`);
    return ((data ?? []) as unknown as { addon_services: AddonServiceData }[]).map(
      (row) => row.addon_services,
    );
  },
);

/**
 * Every published property across every ACTIVE tenant, as (tenant slug,
 * property slug) pairs — what generateStaticParams needs once the public
 * routes live under /s/[tenant] (phase B3b).
 *
 * Joins tenants rather than taking a tenantId because static generation has
 * to enumerate all of them at build time, not one.
 */
export async function listPublishedPropertyPaths(): Promise<
  { tenant: string; slug: string }[]
> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("properties")
    .select("slug, tenants!inner(slug, status)")
    .eq("status", "published")
    .eq("tenants.status", "active");

  return ((data ?? []) as unknown as {
    slug: string;
    tenants: { slug: string };
  }[]).map((p) => ({ tenant: p.tenants.slug, slug: p.slug }));
}

/** Slug + last-modified for one tenant's sitemap. */
export async function listPropertiesForSitemap(
  tenantId: string,
): Promise<{ slug: string; updated_at: string }[]> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("properties")
    .select("slug, updated_at")
    .eq("tenant_id", tenantId)
    .eq("status", "published");
  return data ?? [];
}
