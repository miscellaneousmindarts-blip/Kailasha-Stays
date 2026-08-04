"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { revalidatePublicProperties } from "@/lib/admin/revalidate";
import { AMENITY_KEYS } from "@/lib/amenities";
import { BLOCK_TYPES, blockSchemas, isKnownBlockType } from "@/lib/blocks";
import { checkMediaFile, isVideoPath } from "@/lib/media";
import { slugify } from "@/lib/slug";
import type {
  Property,
  PropertyContact,
  PropertyImage,
  PropertyPrivate,
  PropertySection,
  PropertyStatus,
  RatePeriod,
  SectionAudience,
} from "@/lib/types/database";

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
// Duplicate a listing
//
// Copies everything that *describes* the property — the row itself, its
// private info, contacts, page sections, price periods and add-on selection
// — and, on request, its photos.
//
// Deliberately not copied is everything tied to the original unit's real
// history: bookings, enquiries, and the iCal calendar sources. That last one
// matters most — pointing a second listing at the first one's Airbnb feed
// would block out the wrong flat's dates on every sync.
//
// The copy always lands as a draft, whatever the original's status, so a
// half-edited clone can't go live by accident.
// ---------------------------------------------------------------------------

/** Blocks whose entire content IS the photo — there's nothing left worth
 *  keeping when the copy is made without photos. */
const PHOTO_ONLY_BLOCKS = new Set(["image", "gallery"]);

/**
 * Rewrites every `storage_path` in a block's content through `map`. All three
 * photo-bearing block types (image, gallery, distances) spell an image
 * reference the same way, so walking the JSON generically covers them — and
 * any block type added later — without a per-type branch.
 */
function remapStoragePaths(value: unknown, map: Map<string, string>): unknown {
  if (Array.isArray(value)) return value.map((v) => remapStoragePaths(v, map));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      out[key] =
        key === "storage_path" && typeof v === "string"
          ? (map.get(v) ?? v)
          : remapStoragePaths(v, map);
    }
    return out;
  }
  return value;
}

/**
 * Drops optional image references (a `distances` row's photo, say) when the
 * copy is made without photos. Without this they'd keep pointing at the
 * original listing's files, so the clone would quietly render another
 * property's photos as its own.
 *
 * Blocks whose image isn't optional are skipped wholesale by the caller.
 */
function stripImageRefs(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripImageRefs);
  if (value && typeof value === "object") {
    const entries = value as Record<string, unknown>;
    if (typeof entries.storage_path === "string") return null;
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(entries)) out[key] = stripImageRefs(v);
    return out;
  }
  return value;
}

/** First free slug derived from `title` — `x`, then `x-2`, `x-3`, … */
async function uniquePropertySlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  title: string,
): Promise<string> {
  const base = slugify(title) || "property";
  let slug = base;
  for (let suffix = 2; suffix <= 50; suffix++) {
    const { data: existing } = await supabase
      .from("properties")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!existing) return slug;
    slug = `${base}-${suffix}`;
  }
  return `${base}-${Date.now()}`;
}

export async function duplicateProperty(
  propertyId: string,
  title: string,
  withImages: boolean,
): Promise<ActionResult> {
  const newTitle = title.trim();
  if (!newTitle) return { error: "Give the new listing a title." };
  if (newTitle.length > 160) return { error: "Keep the title under 160 characters." };

  const supabase = await createClient();

  const { data: source, error: readError } = await supabase
    .from("properties")
    .select("*")
    .eq("id", propertyId)
    .maybeSingle();
  if (readError) return { error: readError.message };
  if (!source) return { error: "That listing no longer exists." };

  // Everything except the identity and timestamp columns carries over as-is,
  // so a column added to `properties` later is copied without touching this
  // action.
  const carriedOver: Partial<Property> = { ...(source as Property) };
  delete carriedOver.id;
  delete carriedOver.slug;
  delete carriedOver.created_at;
  delete carriedOver.updated_at;

  const { data: created, error: insertError } = await supabase
    .from("properties")
    .insert({
      ...carriedOver,
      title: newTitle,
      slug: await uniquePropertySlug(supabase, newTitle),
      status: "draft",
    })
    .select("id")
    .single();

  if (insertError) return { error: insertError.message };
  const newId = created.id;

  // Past this point the new listing exists, so any failure has to clean up
  // after itself — a half-copied listing is harder to notice than none.
  const copiedPaths: string[] = [];
  async function rollback(message: string): Promise<ActionResult> {
    if (copiedPaths.length) {
      await supabase.storage.from("property-images").remove(copiedPaths);
    }
    await supabase.from("properties").delete().eq("id", newId);
    return { error: message };
  }

  // --- Photos: real copies, not shared references. Deleting a photo removes
  // --- its file from storage, so two listings pointing at one file would
  // --- mean deleting from either one blanks the other.
  const pathMap = new Map<string, string>();
  if (withImages) {
    const { data: images, error: imagesError } = await supabase
      .from("property_images")
      .select("*")
      .eq("property_id", propertyId)
      .order("sort_order");
    if (imagesError) return rollback(imagesError.message);

    for (const image of (images ?? []) as PropertyImage[]) {
      const ext = image.storage_path.split(".").pop() || "jpg";
      const newPath = `${newId}/${randomUUID()}.${ext}`;
      const { error: copyError } = await supabase.storage
        .from("property-images")
        .copy(image.storage_path, newPath);
      if (copyError) return rollback(`Couldn't copy the photos: ${copyError.message}`);

      copiedPaths.push(newPath);
      pathMap.set(image.storage_path, newPath);
    }

    if (images?.length) {
      const rows = (images as PropertyImage[]).map((image) => ({
        property_id: newId,
        storage_path: pathMap.get(image.storage_path)!,
        alt: image.alt,
        tag: image.tag,
        is_cover: image.is_cover,
        sort_order: image.sort_order,
      }));
      const { error } = await supabase.from("property_images").insert(rows);
      if (error) return rollback(error.message);
    }
  }

  // --- Page sections
  const { data: sections, error: sectionsError } = await supabase
    .from("property_sections")
    .select("*")
    .eq("property_id", propertyId)
    .order("sort_order");
  if (sectionsError) return rollback(sectionsError.message);

  const sectionRows = [];
  for (const section of (sections ?? []) as PropertySection[]) {
    // A photo-only block minus its photos is an empty shell its own schema
    // would reject, so leave it out rather than write something unrenderable.
    if (!withImages && PHOTO_ONLY_BLOCKS.has(section.type)) continue;

    const content = withImages
      ? remapStoragePaths(section.content, pathMap)
      : stripImageRefs(section.content);

    // Stripping can leave a block short of what its schema needs. Validating
    // here means a copy never carries content the renderer would skip anyway.
    if (!withImages && isKnownBlockType(section.type)) {
      if (!blockSchemas[section.type].safeParse(content).success) continue;
    }

    sectionRows.push({
      property_id: newId,
      title: section.title,
      type: section.type,
      content,
      audience: section.audience,
      visible: section.visible,
      sort_order: section.sort_order,
    });
  }
  if (sectionRows.length) {
    const { error } = await supabase.from("property_sections").insert(sectionRows);
    if (error) return rollback(error.message);
  }

  // --- Contacts
  const { data: contacts, error: contactsError } = await supabase
    .from("property_contacts")
    .select("*")
    .eq("property_id", propertyId)
    .order("sort_order");
  if (contactsError) return rollback(contactsError.message);
  if (contacts?.length) {
    const rows = (contacts as PropertyContact[]).map((c) => ({
      property_id: newId,
      name: c.name,
      role: c.role,
      phone: c.phone,
      show_to_guest: c.show_to_guest,
      sort_order: c.sort_order,
    }));
    const { error } = await supabase.from("property_contacts").insert(rows);
    if (error) return rollback(error.message);
  }

  // --- Private info (admin + guest portal only, never public)
  const { data: priv, error: privError } = await supabase
    .from("property_private")
    .select("*")
    .eq("property_id", propertyId)
    .maybeSingle();
  if (privError) return rollback(privError.message);
  if (priv) {
    const { error } = await supabase
      .from("property_private")
      .insert({ ...(priv as PropertyPrivate), property_id: newId });
    if (error) return rollback(error.message);
  }

  // --- Price periods
  const { data: periods, error: periodsError } = await supabase
    .from("rate_periods")
    .select("*")
    .eq("property_id", propertyId);
  if (periodsError) return rollback(periodsError.message);
  if (periods?.length) {
    const rows = (periods as RatePeriod[]).map((p) => ({
      property_id: newId,
      label: p.label,
      start_date: p.start_date,
      end_date: p.end_date,
      direct_price: p.direct_price,
      airbnb_price: p.airbnb_price,
    }));
    const { error } = await supabase.from("rate_periods").insert(rows);
    if (error) return rollback(error.message);
  }

  // --- Which add-ons this listing offers
  const { data: addons, error: addonsError } = await supabase
    .from("property_addon_services")
    .select("addon_service_id")
    .eq("property_id", propertyId);
  if (addonsError) return rollback(addonsError.message);
  if (addons?.length) {
    const rows = addons.map((a) => ({
      property_id: newId,
      addon_service_id: a.addon_service_id,
    }));
    const { error } = await supabase.from("property_addon_services").insert(rows);
    if (error) return rollback(error.message);
  }

  revalidatePath("/admin/listings");
  redirect(editorPath(newId));
}

// ---------------------------------------------------------------------------
// Photos
// ---------------------------------------------------------------------------

export async function uploadPropertyImage(
  propertyId: string,
  formData: FormData,
): Promise<ActionResult & { image?: PropertyImage }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a photo or video to upload." };
  }

  const check = checkMediaFile(file);
  if (check.error) return { error: check.error };

  const supabase = await createClient();
  const path = `${propertyId}/${randomUUID()}.${check.ext}`;

  const { error: uploadError } = await supabase.storage
    .from("property-images")
    .upload(path, file, { contentType: file.type });
  if (uploadError) return { error: uploadError.message };

  const { count } = await supabase
    .from("property_images")
    .select("id", { count: "exact", head: true })
    .eq("property_id", propertyId);

  const alt = String(formData.get("alt") ?? "").trim();

  const { data, error: insertError } = await supabase
    .from("property_images")
    .insert({
      property_id: propertyId,
      storage_path: path,
      alt: alt || null,
      // A video can never be the cover — the cover is what the listings grid,
      // the property card and the OpenGraph tag render, and all three need a
      // still. So the first upload only claims the slot if it's a photo.
      is_cover: !check.isVideo && (count ?? 0) === 0,
      sort_order: count ?? 0,
    })
    .select("*")
    .single();
  if (insertError) return { error: insertError.message };

  revalidateEditor(propertyId);
  return { success: true, image: data as PropertyImage };
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

  // The cover feeds the listings grid, the property card and the OpenGraph
  // tag, none of which can render a moving picture — refuse at the action,
  // not just by hiding the button.
  const { data: target } = await supabase
    .from("property_images")
    .select("storage_path")
    .eq("id", imageId)
    .maybeSingle();
  if (target && isVideoPath(target.storage_path)) {
    return { error: "A video can't be the cover — pick a photo." };
  }

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

export async function updateImageTag(
  propertyId: string,
  imageId: string,
  tag: string,
): Promise<ActionResult> {
  const trimmed = tag.trim();
  if (trimmed.length > 40) return { error: "Keep tags under 40 characters." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("property_images")
    .update({ tag: trimmed || null })
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

/**
 * Persists a drag-and-drop reorder in one round trip: the client already
 * knows the full new order, so this just writes each photo's index as its
 * sort_order rather than walking pairwise swaps like moveInOrderedList.
 */
export async function reorderImages(
  propertyId: string,
  orderedImageIds: string[],
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("property_images")
    .select("id")
    .eq("property_id", propertyId);

  const validIds = new Set((existing ?? []).map((r) => r.id));
  if (
    orderedImageIds.length !== validIds.size ||
    !orderedImageIds.every((id) => validIds.has(id))
  ) {
    return { error: "Photo list is out of date — refresh and try again." };
  }

  const { error } = await Promise.all(
    orderedImageIds.map((id, sort_order) =>
      supabase.from("property_images").update({ sort_order }).eq("id", id),
    ),
  ).then(
    (results) => ({ error: results.find((r) => r.error)?.error?.message }),
  );
  if (error) return { error };

  revalidateEditor(propertyId);
  return { success: true };
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

// ---------------------------------------------------------------------------
// Add-ons — which items from the shared catalog this property offers.
// Presence of a row is the only state; there's nothing to toggle off vs. on
// beyond insert/delete.
// ---------------------------------------------------------------------------

export async function setPropertyAddonEnabled(
  propertyId: string,
  addonServiceId: string,
  enabled: boolean,
): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = enabled
    ? await supabase
        .from("property_addon_services")
        .insert({ property_id: propertyId, addon_service_id: addonServiceId })
    : await supabase
        .from("property_addon_services")
        .delete()
        .eq("property_id", propertyId)
        .eq("addon_service_id", addonServiceId);

  // Re-checking a box that's already checked (a double-click, a stale UI
  // after another tab changed it) hits the primary key — treat as success
  // rather than surfacing a confusing conflict error.
  if (error && error.code !== "23505") return { error: error.message };

  revalidateEditor(propertyId);
  revalidatePublicProperties();
  return { success: true };
}
