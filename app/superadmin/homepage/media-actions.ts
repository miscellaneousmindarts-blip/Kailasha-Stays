"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { requireSuperadmin } from "@/lib/superadmin/queries";
import { checkImageFile } from "@/lib/media";
import type { PlatformImage } from "@/lib/types/database";

export type ActionResult = { error?: string; success?: boolean };

function revalidateHomepage() {
  revalidatePath("/superadmin/homepage");
  revalidatePath("/(platform)", "layout");
}

/** 42P01 = undefined_table — migration 0029 hasn't been applied yet. */
function friendly(error: { code?: string; message: string }): string {
  return error.code === "42P01"
    ? "The apex media library needs migration 0029. Run supabase/migrations/0029_platform_sections.sql in the Supabase SQL editor, then reload this page."
    : error.message;
}

/**
 * Same homepage-media bucket the tenant builder uses (0029's own comment on
 * why: is_superadmin() is a strict subset of the bucket's is_admin() write
 * policy, so no new bucket or storage policy was needed). Only the catalog
 * row lands in a different table.
 *
 * Images only, not video — checkImageFile() not checkMediaFile(). None of the
 * ten apex sections has a video field (unlike the tenant hero, which can be a
 * full-bleed clip); scoping to images means the picker/upload UI never has
 * to handle playback at all.
 */
export async function uploadPlatformImage(
  formData: FormData,
): Promise<ActionResult & { image?: PlatformImage }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a photo to upload." };
  }

  const check = checkImageFile(file);
  if (check.error) return { error: check.error };

  const title = String(formData.get("title") ?? "").trim() || null;
  const alt = String(formData.get("alt") ?? "").trim() || null;

  const { supabase } = await requireSuperadmin();
  const path = `platform/${randomUUID()}.${check.ext}`;

  const { error: uploadError } = await supabase.storage
    .from("homepage-media")
    .upload(path, file, { contentType: file.type });
  if (uploadError) return { error: friendly(uploadError) };

  const { data, error: insertError } = await supabase
    .from("platform_images")
    .insert({ storage_path: path, title, alt, is_placeholder: false })
    .select("*")
    .single();
  if (insertError) return { error: friendly(insertError) };

  revalidateHomepage();
  return { success: true, image: data as PlatformImage };
}

export async function updatePlatformImageMeta(id: string, title: string, alt: string): Promise<ActionResult> {
  const { supabase } = await requireSuperadmin();
  const { error } = await supabase
    .from("platform_images")
    .update({ title: title.trim() || null, alt: alt.trim() || null })
    .eq("id", id);

  if (error) return { error: friendly(error) };
  revalidateHomepage();
  return { success: true };
}

/**
 * No usage-refusal check before deleting, unlike the tenant library's
 * deleteHomepageImage() (which calls homepage_image_usage() to count
 * references first). Not an oversight: there are only 10 sections here, at
 * most one image field each, and resolveHero() already degrades a dangling
 * imageId to "no photo" rather than crashing (lib/platform-sections.ts) — the
 * blast radius of deleting an in-use platform image is one section losing
 * its photo, not a broken page. Add the same RPC-backed guard here if that
 * judgement stops holding.
 */
export async function deletePlatformImage(id: string, storagePath: string): Promise<ActionResult> {
  const { supabase } = await requireSuperadmin();

  const { error: dbError } = await supabase.from("platform_images").delete().eq("id", id);
  if (dbError) return { error: friendly(dbError) };

  if (!storagePath.startsWith("/")) {
    await supabase.storage.from("homepage-media").remove([storagePath]);
  }

  revalidateHomepage();
  return { success: true };
}

export async function readPlatformImages(): Promise<PlatformImage[] | null> {
  const { supabase } = await requireSuperadmin();
  const { data, error } = await supabase
    .from("platform_images")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return null;
  return data as PlatformImage[];
}
