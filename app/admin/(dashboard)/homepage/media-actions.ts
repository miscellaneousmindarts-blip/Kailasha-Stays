"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { HomepageImage } from "@/lib/types/database";

export type ActionResult = { error?: string; success?: boolean };

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function revalidateHomepage() {
  revalidatePath("/admin/homepage");
  revalidatePath("/(public)", "layout");
}

/** 42P01 = undefined_table — migration 0008 hasn't been applied yet. */
function friendly(error: { code?: string; message: string }): string {
  return error.code === "42P01"
    ? "The homepage media library needs migration 0008. Run supabase/migrations/0008_homepage_builder_v2.sql in the Supabase SQL editor, then reload this page."
    : error.message;
}

/**
 * Uploads a photo into the shared homepage-media bucket and adds it to the
 * library in one step — this IS the "choose any number of photos" upload
 * path for every homepage section, builtin or custom.
 */
export async function uploadHomepageImage(
  formData: FormData,
): Promise<ActionResult & { image?: HomepageImage }> {
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

  const title = String(formData.get("title") ?? "").trim() || null;
  const alt = String(formData.get("alt") ?? "").trim() || null;

  const supabase = await createClient();
  const ext = file.type.split("/")[1] ?? "jpg";
  const path = `${randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("homepage-media")
    .upload(path, file, { contentType: file.type });
  if (uploadError) return { error: friendly(uploadError) };

  const { data, error: insertError } = await supabase
    .from("homepage_images")
    .insert({ storage_path: path, title, alt, is_placeholder: false })
    .select("*")
    .single();
  if (insertError) return { error: friendly(insertError) };

  revalidateHomepage();
  return { success: true, image: data as HomepageImage };
}

/** Alt text and the visible caption ("photo title") — both free text, same shape as property photo alt/tag. */
export async function updateHomepageImageMeta(
  id: string,
  title: string,
  alt: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("homepage_images")
    .update({ title: title.trim() || null, alt: alt.trim() || null })
    .eq("id", id);

  if (error) return { error: friendly(error) };
  revalidateHomepage();
  return { success: true };
}

/**
 * Refuses to delete an image still referenced by a section, and says which —
 * `homepage_image_usage()` does a text scan across every section's jsonb
 * content, which is shape-agnostic across all twelve builtin schemas and five
 * custom layouts without needing updating every time a section gains an
 * image field.
 */
export async function deleteHomepageImage(id: string, storagePath: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: usageCount, error: usageError } = await supabase.rpc("homepage_image_usage", {
    image_id: id,
  });
  if (usageError) return { error: friendly(usageError) };
  if (usageCount && usageCount > 0) {
    return {
      error: `This photo is used in ${usageCount} ${usageCount === 1 ? "section" : "sections"}. Remove it from ${usageCount === 1 ? "that section" : "those sections"} first.`,
    };
  }

  const { error: dbError } = await supabase.from("homepage_images").delete().eq("id", id);
  if (dbError) return { error: friendly(dbError) };

  // Storage cleanup is best-effort: a /public seed path has no object to
  // remove, and a failure here shouldn't resurrect the library row.
  if (!storagePath.startsWith("/")) {
    await supabase.storage.from("homepage-media").remove([storagePath]);
  }

  revalidateHomepage();
  return { success: true };
}

export async function readHomepageImages(): Promise<HomepageImage[] | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("homepage_images")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return null;
  return data as HomepageImage[];
}
