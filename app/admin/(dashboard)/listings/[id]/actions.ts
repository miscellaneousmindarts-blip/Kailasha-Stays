"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { revalidatePublicProperties } from "@/lib/admin/revalidate";
import { AMENITY_KEYS } from "@/lib/amenities";
import { BLOCK_TYPES, blockSchemas, isKnownBlockType } from "@/lib/blocks";
import type { Property, PropertyStatus, SectionAudience } from "@/lib/types/database";

export type ActionResult = { error?: string; success?: boolean };

function editorPath(propertyId: string) {
  return `/admin/listings/${propertyId}`;
}

function revalidateEditor(propertyId: string) {
  revalidatePublicProperties();
  revalidatePath(editorPath(propertyId));
}

function strField(formData: FormData, key: string): string | undefined {
  const v = formData.get(key);
  return v === null ? undefined : String(v).trim();
}

function numField(formData: FormData, key: string): number | null | undefined {
  const v = formData.get(key);
  if (v === null) return undefined;
  const s = String(v).trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

// ---------------------------------------------------------------------------
// Basics / description / amenities / location / links / rules — one generic
// update, since every one of those tabs just submits a different subset of
// the same properties row.
// ---------------------------------------------------------------------------

// title/slug/currency are NOT NULL columns — empty means "don't change it",
// never "set to null" (that would violate the column constraint).
const REQUIRED_TEXT_FIELDS = ["title", "slug", "currency"] as const;

const NULLABLE_TEXT_FIELDS = [
  "property_type",
  "description",
  "house_rules",
  "check_in_time",
  "check_out_time",
  "address_line",
  "area",
  "city",
  "state",
  "gmaps_url",
  "airbnb_url",
  "booking_com_url",
] as const;

// max_guests/bedrooms/beds/bathrooms are NOT NULL columns with defaults.
const REQUIRED_NUMBER_FIELDS = ["max_guests", "bedrooms", "beds", "bathrooms"] as const;
const NULLABLE_NUMBER_FIELDS = [
  "base_price",
  "airbnb_base_price",
  "lat",
  "lng",
] as const;

export async function updateProperty(
  propertyId: string,
  formData: FormData,
): Promise<ActionResult> {
  const patch: Partial<Property> = {};

  for (const field of REQUIRED_TEXT_FIELDS) {
    if (formData.has(field)) {
      const value = strField(formData, field);
      if (!value) return { error: `${field[0].toUpperCase()}${field.slice(1)} cannot be empty.` };
      patch[field] = value;
    }
  }
  for (const field of NULLABLE_TEXT_FIELDS) {
    if (formData.has(field)) {
      const value = strField(formData, field);
      patch[field] = value === "" ? null : value;
    }
  }
  for (const field of REQUIRED_NUMBER_FIELDS) {
    if (formData.has(field)) {
      const value = numField(formData, field);
      if (value !== null && value !== undefined) patch[field] = value;
    }
  }
  for (const field of NULLABLE_NUMBER_FIELDS) {
    if (formData.has(field)) patch[field] = numField(formData, field) ?? null;
  }
  if (formData.has("amenities")) {
    const raw = formData.getAll("amenities").map(String);
    patch.amenities = raw.filter((k) => AMENITY_KEYS.includes(k));
  }

  if (typeof patch.slug === "string") {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(patch.slug)) {
      return {
        error: "Slug can only contain lowercase letters, numbers and hyphens.",
      };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("properties")
    .update(patch)
    .eq("id", propertyId);

  if (error) {
    if (error.code === "23505") return { error: "That slug is already in use." };
    return { error: error.message };
  }

  revalidateEditor(propertyId);
  return { success: true };
}

export async function setPropertyStatus(
  propertyId: string,
  status: PropertyStatus,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("properties")
    .update({ status })
    .eq("id", propertyId);

  if (error) return { error: error.message };
  revalidateEditor(propertyId);
  revalidatePath("/admin/listings");
  return { success: true };
}

export async function deleteProperty(propertyId: string) {
  const supabase = await createClient();

  const { data: images } = await supabase
    .from("property_images")
    .select("storage_path")
    .eq("property_id", propertyId);
  if (images?.length) {
    await supabase.storage
      .from("property-images")
      .remove(images.map((i) => i.storage_path));
  }

  const { error } = await supabase
    .from("properties")
    .delete()
    .eq("id", propertyId);

  if (error) {
    if (error.code === "23503") {
      return {
        error:
          "Can't delete — this property has bookings or enquiries on record. Archive it instead.",
      };
    }
    return { error: error.message };
  }

  revalidatePublicProperties();
  revalidatePath("/admin/listings");
  redirect("/admin/listings");
}

// ---------------------------------------------------------------------------
// Photos
// ---------------------------------------------------------------------------

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export async function uploadPropertyImage(
  propertyId: string,
  formData: FormData,
): Promise<ActionResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a photo to upload." };
  }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { error: "Photos must be JPEG, PNG, WebP or AVIF." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { error: "Photos must be under 10MB." };
  }

  const supabase = await createClient();
  const ext = file.type.split("/")[1] ?? "jpg";
  const path = `${propertyId}/${randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("property-images")
    .upload(path, file, { contentType: file.type });
  if (uploadError) return { error: uploadError.message };

  const { count } = await supabase
    .from("property_images")
    .select("id", { count: "exact", head: true })
    .eq("property_id", propertyId);

  const { error: insertError } = await supabase.from("property_images").insert({
    property_id: propertyId,
    storage_path: path,
    is_cover: (count ?? 0) === 0,
    sort_order: count ?? 0,
  });
  if (insertError) return { error: insertError.message };

  revalidateEditor(propertyId);
  return { success: true };
}

export async function deletePropertyImage(
  propertyId: string,
  imageId: string,
  storagePath: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  await supabase.storage.from("property-images").remove([storagePath]);

  const { error } = await supabase
    .from("property_images")
    .delete()
    .eq("id", imageId);
  if (error) return { error: error.message };

  revalidateEditor(propertyId);
  return { success: true };
}

export async function setCoverImage(
  propertyId: string,
  imageId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  await supabase
    .from("property_images")
    .update({ is_cover: false })
    .eq("property_id", propertyId)
    .eq("is_cover", true);

  const { error } = await supabase
    .from("property_images")
    .update({ is_cover: true })
    .eq("id", imageId);
  if (error) return { error: error.message };

  revalidateEditor(propertyId);
  return { success: true };
}

export async function updateImageAlt(
  propertyId: string,
  imageId: string,
  alt: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("property_images")
    .update({ alt: alt.trim() || null })
    .eq("id", imageId);
  if (error) return { error: error.message };

  revalidateEditor(propertyId);
  return { success: true };
}

/** Swaps sort_order with the previous/next sibling — a simple, fully
 *  keyboard-accessible stand-in for drag reordering. */
async function moveInOrderedList(
  table: "property_images" | "property_contacts" | "property_sections",
  propertyId: string,
  itemId: string,
  direction: "up" | "down",
) {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from(table)
    .select("id, sort_order")
    .eq("property_id", propertyId)
    .order("sort_order");

  if (!rows) return { error: "Not found." };
  const index = rows.findIndex((r) => r.id === itemId);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapIndex < 0 || swapIndex >= rows.length) {
    return { success: true }; // already at an edge — nothing to do
  }

  const a = rows[index];
  const b = rows[swapIndex];
  await Promise.all([
    supabase.from(table).update({ sort_order: b.sort_order }).eq("id", a.id),
    supabase.from(table).update({ sort_order: a.sort_order }).eq("id", b.id),
  ]);

  revalidateEditor(propertyId);
  return { success: true };
}

export async function moveImage(
  propertyId: string,
  imageId: string,
  direction: "up" | "down",
): Promise<ActionResult> {
  return moveInOrderedList("property_images", propertyId, imageId, direction);
}

// ---------------------------------------------------------------------------
// Contacts
// ---------------------------------------------------------------------------

export async function addContact(
  propertyId: string,
  formData: FormData,
): Promise<ActionResult> {
  const name = strField(formData, "name");
  const phone = strField(formData, "phone");
  if (!name || !phone) return { error: "Name and phone are required." };

  const supabase = await createClient();
  const { count } = await supabase
    .from("property_contacts")
    .select("id", { count: "exact", head: true })
    .eq("property_id", propertyId);

  const { error } = await supabase.from("property_contacts").insert({
    property_id: propertyId,
    name,
    phone,
    role: strField(formData, "role") || null,
    show_to_guest: formData.get("show_to_guest") === "on",
    sort_order: count ?? 0,
  });
  if (error) return { error: error.message };

  revalidateEditor(propertyId);
  return { success: true };
}

export async function updateContact(
  propertyId: string,
  contactId: string,
  formData: FormData,
): Promise<ActionResult> {
  const name = strField(formData, "name");
  const phone = strField(formData, "phone");
  if (!name || !phone) return { error: "Name and phone are required." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("property_contacts")
    .update({
      name,
      phone,
      role: strField(formData, "role") || null,
      show_to_guest: formData.get("show_to_guest") === "on",
    })
    .eq("id", contactId);
  if (error) return { error: error.message };

  revalidateEditor(propertyId);
  return { success: true };
}

export async function deleteContact(
  propertyId: string,
  contactId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("property_contacts")
    .delete()
    .eq("id", contactId);
  if (error) return { error: error.message };

  revalidateEditor(propertyId);
  return { success: true };
}

export async function moveContact(
  propertyId: string,
  contactId: string,
  direction: "up" | "down",
): Promise<ActionResult> {
  return moveInOrderedList("property_contacts", propertyId, contactId, direction);
}

// ---------------------------------------------------------------------------
// Private info (guest portal + admin only)
// ---------------------------------------------------------------------------

export async function updatePropertyPrivate(
  propertyId: string,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("property_private").upsert(
    {
      property_id: propertyId,
      exact_address: strField(formData, "exact_address") || null,
      exact_gmaps_url: strField(formData, "exact_gmaps_url") || null,
      directions_note: strField(formData, "directions_note") || null,
      wifi_name: strField(formData, "wifi_name") || null,
      wifi_password: strField(formData, "wifi_password") || null,
      door_code: strField(formData, "door_code") || null,
      other_notes: strField(formData, "other_notes") || null,
    },
    { onConflict: "property_id" },
  );
  if (error) return { error: error.message };

  revalidatePath(editorPath(propertyId));
  return { success: true };
}

// ---------------------------------------------------------------------------
// Sections (the page builder)
// ---------------------------------------------------------------------------

export async function addSection(
  propertyId: string,
  type: string,
  audience: SectionAudience,
): Promise<ActionResult & { id?: string }> {
  if (!isKnownBlockType(type)) return { error: "Unknown block type." };

  const supabase = await createClient();
  const { count } = await supabase
    .from("property_sections")
    .select("id", { count: "exact", head: true })
    .eq("property_id", propertyId);

  const { data, error } = await supabase
    .from("property_sections")
    .insert({
      property_id: propertyId,
      type,
      audience,
      title: null,
      content: BLOCK_TYPES[type].empty,
      visible: true,
      sort_order: count ?? 0,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidateEditor(propertyId);
  return { success: true, id: data.id };
}

export async function updateSectionMeta(
  propertyId: string,
  sectionId: string,
  patch: { title?: string | null; audience?: SectionAudience; visible?: boolean },
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("property_sections")
    .update(patch)
    .eq("id", sectionId);
  if (error) return { error: error.message };

  revalidateEditor(propertyId);
  return { success: true };
}

/** Validates content against its block's schema before saving — a bad edit
 *  can never reach the database in a shape the renderer can't handle. */
export async function updateSectionContent(
  propertyId: string,
  sectionId: string,
  type: string,
  content: unknown,
): Promise<ActionResult> {
  if (!isKnownBlockType(type)) return { error: "Unknown block type." };

  const parsed = blockSchemas[type].safeParse(content);
  if (!parsed.success) {
    return { error: "That section's content isn't valid yet." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("property_sections")
    .update({ content: parsed.data })
    .eq("id", sectionId);
  if (error) return { error: error.message };

  revalidateEditor(propertyId);
  return { success: true };
}

export async function deleteSection(
  propertyId: string,
  sectionId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("property_sections")
    .delete()
    .eq("id", sectionId);
  if (error) return { error: error.message };

  revalidateEditor(propertyId);
  return { success: true };
}

export async function moveSection(
  propertyId: string,
  sectionId: string,
  direction: "up" | "down",
): Promise<ActionResult> {
  return moveInOrderedList("property_sections", propertyId, sectionId, direction);
}

// ---------------------------------------------------------------------------
// Rate periods — per-date-range pricing for each channel
// ---------------------------------------------------------------------------

export async function addRatePeriod(
  propertyId: string,
  formData: FormData,
): Promise<ActionResult> {
  const startDate = strField(formData, "start_date");
  const endDate = strField(formData, "end_date");
  const label = strField(formData, "label");
  const directPrice = numField(formData, "direct_price");
  const airbnbPrice = numField(formData, "airbnb_price");

  if (!startDate || !endDate) return { error: "Pick a start and end date." };
  if (endDate <= startDate) {
    return { error: "The end date must be after the start date." };
  }
  if (directPrice === null || directPrice === undefined) {
    return { error: "Enter a direct price for these dates." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("rate_periods").insert({
    property_id: propertyId,
    label: label || null,
    start_date: startDate,
    end_date: endDate,
    direct_price: directPrice,
    airbnb_price: airbnbPrice ?? null,
  });

  if (error) {
    // 23P01 = the exclusion constraint: these dates overlap an existing period,
    // which would make the nightly rate ambiguous.
    if (error.code === "23P01") {
      return {
        error: "Those dates overlap an existing price period. Edit that one instead.",
      };
    }
    return { error: error.message };
  }

  revalidateEditor(propertyId);
  return { success: true };
}

export async function deleteRatePeriod(
  propertyId: string,
  ratePeriodId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("rate_periods")
    .delete()
    .eq("id", ratePeriodId);
  if (error) return { error: error.message };

  revalidateEditor(propertyId);
  return { success: true };
}
