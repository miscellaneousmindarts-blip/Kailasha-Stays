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

/** Published properties for the /properties grid, in the admin's chosen order. */
export const listProperties = cache(async (): Promise<PropertyCardData[]> => {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("properties")
    .select(
      "id, slug, title, summary, area, city, max_guests, bedrooms, bathrooms, base_price, currency, property_type, property_images(storage_path, alt, is_cover)",
    )
    .eq("status", "published")
    .order("sort_order")
    .order("created_at");

  if (error) throw new Error(`Could not load properties: ${error.message}`);
  return (data ?? []) as PropertyCardData[];
});

/**
 * One property with its photos and public sections.
 * RLS already filters sections to visible + public/both for anon callers.
 */
export const getProperty = cache(
  async (slug: string): Promise<PropertyDetail | null> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("properties")
      .select("*, property_images(*), property_sections(*), rate_periods(*)")
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

/** Active add-ons available for a property: its own + the global (property_id null) ones. */
export const getAddonsForProperty = cache(
  async (propertyId: string): Promise<AddonServiceData[]> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("addon_services")
      .select("id, name, description, price, price_unit")
      .eq("active", true)
      .or(`property_id.eq.${propertyId},property_id.is.null`)
      .order("sort_order");

    if (error) throw new Error(`Could not load add-ons: ${error.message}`);
    return (data ?? []) as AddonServiceData[];
  },
);

/** Slugs for generateStaticParams / sitemap. */
export async function listPropertySlugs(): Promise<string[]> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("properties")
    .select("slug")
    .eq("status", "published");
  return (data ?? []).map((p) => p.slug);
}

/** Slug + last-modified for the sitemap. */
export async function listPropertiesForSitemap(): Promise<
  { slug: string; updated_at: string }[]
> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("properties")
    .select("slug, updated_at")
    .eq("status", "published");
  return data ?? [];
}
