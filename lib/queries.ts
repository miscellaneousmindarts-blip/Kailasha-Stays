import { cache } from "react";

import { createPublicClient } from "@/lib/supabase/public";
import type {
  Property,
  PropertyImage,
  PropertySection,
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
      .select("*, property_images(*), property_sections(*)")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();

    if (error) throw new Error(`Could not load property: ${error.message}`);
    if (!data) return null;

    const property = data as PropertyDetail;
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

/** Slugs for generateStaticParams / sitemap. */
export async function listPropertySlugs(): Promise<string[]> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("properties")
    .select("slug")
    .eq("status", "published");
  return (data ?? []).map((p) => p.slug);
}
