"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  BUILTIN_SECTIONS,
  blankLayout,
  isLayoutType,
  layoutSchemas,
} from "@/lib/homepage-blocks";
import type { HomepageSection } from "@/lib/types/database";

export type ActionResult = { error?: string; success?: boolean };

/**
 * The homepage is force-dynamic, so it re-reads on every request and needs no
 * revalidation of its own — but the admin route caches, so it does.
 */
function revalidateBuilder() {
  revalidatePath("/admin/homepage");
}

const NOT_APPLIED =
  "The homepage builder needs migration 0007. Run supabase/migrations/0007_homepage_sections.sql in the Supabase SQL editor, then reload this page.";

/** Postgres 42P01 = undefined_table, i.e. the migration hasn't been applied. */
function friendly(error: { code?: string; message: string }): string {
  return error.code === "42P01" ? NOT_APPLIED : error.message;
}

export async function updateSectionVisibility(
  id: string,
  visible: boolean,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("homepage_sections")
    .update({ visible })
    .eq("id", id)
    // Refuse at the query, not just in the UI: a locked section is one the page
    // cannot render without.
    .eq("locked", false)
    .select("id");

  if (error) return { error: friendly(error) };
  if (!data?.length) return { error: "That section can't be hidden." };

  revalidateBuilder();
  return { success: true };
}

/**
 * Swaps sort_order with the neighbour in the given direction.
 *
 * Locked sections are skipped as move targets AND as movers, which keeps the
 * hero first and the closing CTA last without needing a separate pinning
 * mechanism — nothing can be reordered past them because they refuse to swap.
 */
export async function moveSection(
  id: string,
  direction: "up" | "down",
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: rows, error: readError } = await supabase
    .from("homepage_sections")
    .select("id,sort_order,locked")
    .order("sort_order", { ascending: true });

  if (readError) return { error: friendly(readError) };
  if (!rows) return { error: "Couldn't read the section order." };

  const index = rows.findIndex((r) => r.id === id);
  if (index === -1) return { error: "That section no longer exists." };
  if (rows[index].locked) return { error: "That section can't be moved." };

  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= rows.length) return { success: true };
  if (rows[target].locked) return { error: "That section can't move any further." };

  const a = rows[index];
  const b = rows[target];
  const [{ error: e1 }, { error: e2 }] = await Promise.all([
    supabase.from("homepage_sections").update({ sort_order: b.sort_order }).eq("id", a.id),
    supabase.from("homepage_sections").update({ sort_order: a.sort_order }).eq("id", b.id),
  ]);
  if (e1 || e2) return { error: (e1 ?? e2)!.message };

  revalidateBuilder();
  return { success: true };
}

/**
 * Saves a builtin section's copy and image overrides.
 *
 * Only fields declared in the registry are written, so a crafted form post
 * can't smuggle arbitrary keys into the jsonb, and blanks are dropped rather
 * than stored — an absent key is what makes the code default apply, so
 * clearing a field has to actually remove it.
 */
export async function updateBuiltinOverrides(
  key: string,
  formData: FormData,
): Promise<ActionResult> {
  const spec = BUILTIN_SECTIONS[key];
  if (!spec) return { error: "Unknown section." };

  const content: Record<string, string> = {};
  for (const field of spec.fields) {
    const value = String(formData.get(field.key) ?? "").trim();
    if (value) content[field.key] = value;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("homepage_sections")
    .update({ content })
    .eq("key", key)
    .eq("kind", "builtin");

  if (error) return { error: friendly(error) };
  revalidateBuilder();
  return { success: true };
}

export async function addCustomSection(
  type: string,
): Promise<ActionResult & { id?: string }> {
  if (!isLayoutType(type)) return { error: "Unknown layout." };

  const supabase = await createClient();
  const { data: rows, error: readError } = await supabase
    .from("homepage_sections")
    .select("key,sort_order,locked")
    .order("sort_order", { ascending: true });
  if (readError) return { error: friendly(readError) };

  // Land it just above the last locked section (the closing CTA) so a new
  // section never appears after the page's final call to action.
  const lastUnlocked = [...(rows ?? [])].reverse().find((r) => !r.locked);
  const sortOrder = (lastUnlocked?.sort_order ?? 0) + 5;

  const used = new Set((rows ?? []).map((r) => r.key));
  let n = 1;
  while (used.has(`${type}_${n}`)) n += 1;

  const { data, error } = await supabase
    .from("homepage_sections")
    .insert({
      key: `${type}_${n}`,
      kind: "custom",
      type,
      title: null,
      content: blankLayout(type),
      visible: false, // Hidden until the admin has filled it in and saved.
      locked: false,
      sort_order: sortOrder,
    })
    .select("id")
    .single();

  if (error) return { error: friendly(error) };
  revalidateBuilder();
  return { success: true, id: data.id };
}

/** Content arrives as JSON from the layout editor and is schema-checked here. */
export async function updateCustomSection(
  id: string,
  type: string,
  title: string | null,
  content: unknown,
): Promise<ActionResult> {
  if (!isLayoutType(type)) return { error: "Unknown layout." };

  const parsed = layoutSchemas[type].safeParse(content);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      error: first
        ? `${first.path.join(".") || "This section"}: ${first.message.toLowerCase()}`
        : "That section isn't filled in yet.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("homepage_sections")
    .update({ title: title?.trim() || null, content: parsed.data })
    .eq("id", id)
    .eq("kind", "custom");

  if (error) return { error: friendly(error) };
  revalidateBuilder();
  return { success: true };
}

export async function deleteCustomSection(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("homepage_sections")
    .delete()
    .eq("id", id)
    .eq("kind", "custom");

  if (error) return { error: friendly(error) };
  revalidateBuilder();
  return { success: true };
}

/** Read for the builder page. Returns null when the migration isn't applied. */
export async function readHomepageSections(): Promise<HomepageSection[] | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("homepage_sections")
    .select("id,key,kind,type,title,content,visible,locked,sort_order,updated_at")
    .order("sort_order", { ascending: true });

  if (error) return null;
  return data as HomepageSection[];
}
