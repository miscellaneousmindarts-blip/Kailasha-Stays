"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentTenantId } from "@/lib/admin/tenant";
import {
  blankLayout,
  builtinSchemas,
  isBuiltinKey,
  isLayoutType,
  layoutSchemas,
  type BuiltinKey,
} from "@/lib/homepage-blocks";
import type { HomepageSection, SiteSettings } from "@/lib/types/database";

export type ActionResult = { error?: string; success?: boolean };

/**
 * The homepage is force-dynamic, so it re-reads on every request and needs no
 * revalidation of its own — but the admin route caches, so it does.
 */
function revalidateBuilder() {
  revalidatePath("/admin/homepage");
  revalidatePath("/(public)", "layout");
}

const NOT_APPLIED =
  "The homepage builder needs migration 0008. Run supabase/migrations/0008_homepage_builder_v2.sql in the Supabase SQL editor, then reload this page.";

/** Postgres 42P01 = undefined_table, i.e. the migration hasn't been applied. */
function friendly(error: { code?: string; message: string }): string {
  return error.code === "42P01" ? NOT_APPLIED : error.message;
}

export async function updateSectionVisibility(id: string, visible: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("homepage_sections")
    .update({ visible })
    .eq("id", id)
    // Refuse at the query, not just in the UI — belt and suspenders against
    // a crafted request for a row the outline's own drag/toggle guards would
    // never send. Every builtin is hideable; see 0009_homepage_homes_hideable.
    .eq("can_hide", true)
    .select("id");

  if (error) return { error: friendly(error) };
  if (!data?.length) return { error: "That section can't be hidden." };

  revalidateBuilder();
  return { success: true };
}

/**
 * Bulk reorder from the drag-and-drop outline: writes sort_order = index*10
 * for every row in one pass. Rejects the whole reorder rather than applying
 * it partially if a pinned row (hero must stay first, close must stay last)
 * would move — the outline's own drag constraints should prevent this from
 * ever being sent, so a rejection here means the client-side guard was
 * bypassed, not that the user made a normal mistake.
 */
export async function reorderSections(orderedIds: string[]): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: rows, error: readError } = await supabase
    .from("homepage_sections")
    .select("id,pin");
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
    supabase.from("homepage_sections").update({ sort_order: index * 10 }).eq("id", id),
  );
  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) return { error: failed.error.message };

  revalidateBuilder();
  return { success: true };
}

/**
 * A few site_settings columns are read by exactly ONE homepage section, so
 * they're edited inside that section's own form rather than on a distant
 * settings page — you set the host's name where you can see the host section
 * it appears in. They stay in site_settings rather than moving into the
 * section's jsonb because the token resolver reads them from there.
 *
 * The whitelist is what makes that safe: a crafted request can only ever
 * touch the columns its section is allowed to, never arbitrary settings.
 *
 * Values quoted by MORE than one section (cancel_days, advance_pct,
 * reply_minutes) deliberately stay on the Settings page — see
 * updateBookingPolicy for why.
 */
type SectionSettingKey = "host_name" | "host_years" | "hotel_room_rate";

const SECTION_SETTINGS: Partial<Record<BuiltinKey, readonly SectionSettingKey[]>> = {
  meet_host: ["host_name", "host_years"],
  why_apartment: ["hotel_room_rate"],
};

/**
 * Saves a builtin section's whole content, validated against its zod schema.
 * Unlike v1, `content` is the entire section (see plan §1) — it's sent as
 * JSON from the editor's own local state, not read off a <form>, because
 * several sections hold arrays (FAQ items, trust-ribbon items, review cards)
 * that don't map cleanly onto FormData.
 *
 * `settingsPatch` carries this section's own site_settings values (if it has
 * any) so the editor keeps a single Save button rather than two.
 */
export async function updateBuiltinSection(
  id: string,
  key: string,
  content: unknown,
  settingsPatch?: Partial<Record<SectionSettingKey, string | number | null>>,
): Promise<ActionResult> {
  if (!isBuiltinKey(key)) return { error: "Unknown section." };

  const parsed = builtinSchemas[key].safeParse(content);
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
    .update({ content: parsed.data })
    .eq("id", id)
    .eq("kind", "builtin");

  if (error) return { error: friendly(error) };

  if (settingsPatch) {
    const allowed = SECTION_SETTINGS[key] ?? [];
    const patch: Partial<Pick<SiteSettings, SectionSettingKey>> = {};
    for (const column of allowed) {
      if (!(column in settingsPatch)) continue;
      const value = settingsPatch[column];
      if (column === "hotel_room_rate") {
        const n = Number(value);
        if (!Number.isFinite(n) || n < 0) return { error: "Enter a valid hotel room rate." };
        patch.hotel_room_rate = n;
      } else {
        patch[column] = value === null || value === "" ? null : String(value);
      }
    }

    if (Object.keys(patch).length) {
      const { error: settingsError } = await supabase
        .from("site_settings")
        .update(patch)
        .eq("tenant_id", await getCurrentTenantId(supabase));
      // The section content already saved, so report the settings failure
      // rather than pretending the whole save succeeded.
      if (settingsError) return { error: settingsError.message };
    }
  }

  revalidateBuilder();
  return { success: true };
}

export async function addCustomSection(
  type: string,
): Promise<ActionResult & { id?: string; tenantId?: string }> {
  if (!isLayoutType(type)) return { error: "Unknown layout." };

  const supabase = await createClient();
  const { data: rows, error: readError } = await supabase
    .from("homepage_sections")
    .select("key,sort_order,pin")
    .order("sort_order", { ascending: true });
  if (readError) return { error: friendly(readError) };

  // Land it just above the pinned closing section, so a new section never
  // appears after the page's final call to action.
  const beforeLast = [...(rows ?? [])].reverse().find((r) => r.pin !== "last");
  const sortOrder = (beforeLast?.sort_order ?? 0) + 5;

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
      can_hide: true,
      pin: null,
      sort_order: sortOrder,
    })
    // tenant_id is filled in by a database trigger, and the builder's
    // optimistic row needs the real value rather than a guess.
    .select("id,tenant_id")
    .single();

  if (error) return { error: friendly(error) };
  revalidateBuilder();
  return { success: true, id: data.id, tenantId: data.tenant_id };
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
    .select("id,key,kind,type,title,content,visible,locked,can_hide,pin,sort_order,updated_at")
    .order("sort_order", { ascending: true });

  if (error) return null;
  return data as HomepageSection[];
}
