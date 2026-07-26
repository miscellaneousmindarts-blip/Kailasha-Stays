import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  Property,
  PropertyContact,
  PropertyImage,
  PropertyPrivate,
  PropertySection,
} from "@/lib/types/database";

export type AdminPropertyRow = Pick<
  Property,
  | "id"
  | "slug"
  | "title"
  | "status"
  | "area"
  | "city"
  | "base_price"
  | "currency"
  | "sort_order"
  | "updated_at"
> & { property_images: Pick<PropertyImage, "storage_path" | "is_cover">[] };

/** Every property regardless of status — the admin listings table. */
export async function listAllProperties(): Promise<AdminPropertyRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .select(
      "id, slug, title, status, area, city, base_price, currency, sort_order, updated_at, property_images(storage_path, is_cover)",
    )
    .order("sort_order")
    .order("created_at");

  if (error) throw new Error(`Could not load properties: ${error.message}`);
  return (data ?? []) as AdminPropertyRow[];
}

export type PropertyForEdit = Property & {
  property_images: PropertyImage[];
  property_sections: PropertySection[];
  property_contacts: PropertyContact[];
  property_private: PropertyPrivate | null;
};

export async function getPropertyForEdit(
  id: string,
): Promise<PropertyForEdit | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .select(
      "*, property_images(*), property_sections(*), property_contacts(*), property_private(*)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Could not load property: ${error.message}`);
  if (!data) return null;

  const property = data as unknown as PropertyForEdit & {
    property_private: PropertyPrivate[] | PropertyPrivate | null;
  };

  property.property_images = [...(property.property_images ?? [])].sort(
    (a, b) => Number(b.is_cover) - Number(a.is_cover) || a.sort_order - b.sort_order,
  );
  property.property_sections = [...(property.property_sections ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  );
  property.property_contacts = [...(property.property_contacts ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  );
  property.property_private = Array.isArray(property.property_private)
    ? (property.property_private[0] ?? null)
    : (property.property_private ?? null);

  return property as PropertyForEdit;
}
