"use server";

import { revalidatePath } from "next/cache";

import { requireSuperadmin } from "@/lib/superadmin/queries";
import { isPlatformSectionKey, platformSectionSchemas } from "@/lib/platform-sections";
import type { PlatformSection } from "@/lib/types/database";

export type ActionResult = { error?: string; success?: boolean };

/** force-dynamic apex re-reads on every request; the builder route caches. */
function revalidateBuilder() {
  revalidatePath("/superadmin/homepage");
  revalidatePath("/(platform)", "layout");
}

/** Postgres 42P01 = undefined_table, i.e. migration 0029 hasn't been applied. */
function friendly(error: { code?: string; message: string }): string {
  return error.code === "42P01"
    ? "The apex homepage builder needs migration 0029. Run supabase/migrations/0029_platform_sections.sql in the Supabase SQL editor, then reload this page."
    : error.message;
}

/**
 * Mirrors app/admin/(dashboard)/homepage/actions.ts's updateSectionVisibility()
 * exactly, including the belt-and-suspenders .eq("can_hide", true) — refuse
 * hiding hero/homes/final_cta at the query, not just by the outline UI
 * disabling their toggle.
 */
export async function updatePlatformSectionVisibility(id: string, visible: boolean): Promise<ActionResult> {
  const { supabase } = await requireSuperadmin();
  const { data, error } = await supabase
    .from("platform_sections")
    .update({ visible })
    .eq("id", id)
    .eq("can_hide", true)
    .select("id");

  if (error) return { error: friendly(error) };
  if (!data?.length) return { error: "That section can't be hidden." };

  revalidateBuilder();
  return { success: true };
}

/**
 * Bulk reorder from the drag-and-drop outline. Same pinned-row rejection as
 * the tenant builder's reorderSections() — hero must stay first, final_cta
 * must stay last — but there are no custom sections here to worry about
 * inserting mid-drag.
 */
export async function reorderPlatformSections(orderedIds: string[]): Promise<ActionResult> {
  const { supabase } = await requireSuperadmin();
  const { data: rows, error: readError } = await supabase.from("platform_sections").select("id,pin");
  if (readError) return { error: friendly(readError) };
  if (!rows) return { error: "Couldn't read the section order." };

  const known = new Set(rows.map((r) => r.id));
  if (orderedIds.length !== rows.length || orderedIds.some((id) => !known.has(id))) {
    return { error: "That order doesn't match the current sections. Reload and try again." };
  }

  const first = rows.find((r) => r.pin === "first");
  const last = rows.find((r) => r.pin === "last");
  if (first && orderedIds[0] !== first.id) {
    return { error: "The hero has to stay first." };
  }
  if (last && orderedIds[orderedIds.length - 1] !== last.id) {
    return { error: "The closing section has to stay last." };
  }

  const updates = orderedIds.map((id, index) =>
    supabase.from("platform_sections").update({ sort_order: index * 10 }).eq("id", id),
  );
  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) return { error: failed.error.message };

  revalidateBuilder();
  return { success: true };
}

/**
 * Saves a section's whole content, validated against its own zod schema from
 * lib/platform-sections.ts. Unlike the tenant builder's updateBuiltinSection,
 * there is no settingsPatch — the apex has no site_settings row of its own,
 * so every editable field lives in the section's jsonb, full stop.
 */
export async function updatePlatformSection(id: string, key: string, content: unknown): Promise<ActionResult> {
  if (!isPlatformSectionKey(key)) return { error: "Unknown section." };

  const parsed = platformSectionSchemas[key].safeParse(content);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      error: first
        ? `${first.path.join(".") || "This section"}: ${first.message.toLowerCase()}`
        : "That section isn't filled in yet.",
    };
  }

  const { supabase } = await requireSuperadmin();
  const { error } = await supabase.from("platform_sections").update({ content: parsed.data }).eq("id", id);

  if (error) return { error: friendly(error) };
  revalidateBuilder();
  return { success: true };
}

/** Read for the builder page. Returns null when the migration isn't applied. */
export async function readPlatformSections(): Promise<PlatformSection[] | null> {
  const { supabase } = await requireSuperadmin();
  const { data, error } = await supabase
    .from("platform_sections")
    .select("id,key,content,visible,can_hide,pin,sort_order,updated_at")
    .order("sort_order", { ascending: true });

  if (error) return null;
  return data as PlatformSection[];
}
