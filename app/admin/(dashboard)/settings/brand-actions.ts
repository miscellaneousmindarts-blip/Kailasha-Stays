"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { requireTenant } from "@/lib/admin/auth";
import { checkImageFile } from "@/lib/media";

export type ActionResult = { error?: string; success?: boolean };

function revalidateBrand() {
  revalidatePath("/admin/settings");
  revalidatePath("/(public)", "layout");
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

/**
 * Shared by the logo and favicon upload actions: puts the file at
 * {tenantId}/branding/{slot}-{uuid}.{ext} in the homepage-media bucket,
 * removes whatever file used to occupy that column (best-effort — a failed
 * delete shouldn't block the new asset from taking effect), and writes the
 * new path onto the given site_settings column.
 *
 * Tenant-prefixed on purpose, ahead of phase B8's bucket-wide re-path: this
 * is new code with no legacy data to migrate, so there's no reason for it to
 * start out flat like the rest of the bucket does today.
 */
async function uploadBrandAsset(
  slot: "logo" | "favicon",
  column: "logo_path" | "favicon_path",
  file: File,
): Promise<ActionResult & { path?: string }> {
  const check = checkImageFile(file);
  if (check.error) return { error: check.error };

  const { supabase, tenant } = await requireTenant();

  const { data: current } = await supabase
    .from("site_settings")
    .select("logo_path, favicon_path")
    .eq("tenant_id", tenant.id)
    .maybeSingle();
  const previousPath = current?.[column] ?? null;

  const path = `${tenant.id}/branding/${slot}-${randomUUID()}.${check.ext}`;
  const { error: uploadError } = await supabase.storage
    .from("homepage-media")
    .upload(path, file, { contentType: file.type });
  if (uploadError) return { error: uploadError.message };

  // A computed key on the update payload defeats Supabase's excess-property
  // check on Partial<SiteSettings>, so the column is spelled out explicitly
  // on each branch instead of `{ [column]: path }`.
  const patch = column === "logo_path" ? { logo_path: path } : { favicon_path: path };
  const { error: updateError } = await supabase
    .from("site_settings")
    .update(patch)
    .eq("tenant_id", tenant.id);
  if (updateError) {
    // The row update is what actually matters; an orphaned upload with
    // nothing pointing at it is harmless, so it's not worth failing over.
    await supabase.storage.from("homepage-media").remove([path]);
    return { error: updateError.message };
  }

  if (previousPath && !previousPath.startsWith("/")) {
    await supabase.storage.from("homepage-media").remove([previousPath]);
  }

  revalidateBrand();
  return { success: true, path };
}

async function removeBrandAsset(
  column: "logo_path" | "favicon_path",
): Promise<ActionResult> {
  const { supabase, tenant } = await requireTenant();

  const { data: current } = await supabase
    .from("site_settings")
    .select("logo_path, favicon_path")
    .eq("tenant_id", tenant.id)
    .maybeSingle();
  const path = current?.[column] ?? null;

  const patch = column === "logo_path" ? { logo_path: null } : { favicon_path: null };
  const { error } = await supabase
    .from("site_settings")
    .update(patch)
    .eq("tenant_id", tenant.id);
  if (error) return { error: error.message };

  if (path && !path.startsWith("/")) {
    await supabase.storage.from("homepage-media").remove([path]);
  }

  revalidateBrand();
  return { success: true };
}

export async function uploadBrandLogo(formData: FormData): Promise<ActionResult & { path?: string }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose an image." };
  return uploadBrandAsset("logo", "logo_path", file);
}

export async function removeBrandLogo(): Promise<ActionResult> {
  return removeBrandAsset("logo_path");
}

export async function uploadBrandFavicon(formData: FormData): Promise<ActionResult & { path?: string }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose an image." };
  return uploadBrandAsset("favicon", "favicon_path", file);
}

export async function removeBrandFavicon(): Promise<ActionResult> {
  return removeBrandAsset("favicon_path");
}

export async function updateBrandDetails(formData: FormData): Promise<ActionResult> {
  const brandColorRaw = String(formData.get("brand_color") ?? "").trim();
  if (brandColorRaw && !HEX_RE.test(brandColorRaw)) {
    return { error: "Brand color must be a hex value like #c2410c." };
  }

  const legalName = String(formData.get("legal_name") ?? "").trim();
  const footerNote = String(formData.get("footer_note") ?? "").trim();
  if (footerNote.length > 500) return { error: "Keep the footer note under 500 characters." };

  const { supabase, tenant } = await requireTenant();
  const { error } = await supabase
    .from("site_settings")
    .update({
      brand_color: brandColorRaw || null,
      legal_name: legalName || null,
      footer_note: footerNote || null,
    })
    .eq("tenant_id", tenant.id);

  if (error) return { error: error.message };
  revalidateBrand();
  return { success: true };
}
