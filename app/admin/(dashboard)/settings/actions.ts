"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { syncCalendarSource } from "@/lib/admin/ical-sync";
import { revalidatePublicProperties } from "@/lib/admin/revalidate";
import type { CalendarPlatform } from "@/lib/types/database";

export type ActionResult = { error?: string; success?: boolean };

function revalidateSettings() {
  revalidatePath("/admin/settings");
  revalidatePath("/(public)", "layout");
}

export async function updateSiteSettings(formData: FormData): Promise<ActionResult> {
  const businessName = String(formData.get("business_name") ?? "").trim();
  if (!businessName) return { error: "Business name cannot be empty." };

  const whatsapp = String(formData.get("whatsapp_number") ?? "").trim();
  if (whatsapp && !/^[1-9][0-9]{7,14}$/.test(whatsapp)) {
    return {
      error:
        "WhatsApp number must be digits only, international format, e.g. 919876543210.",
    };
  }

  const email = String(formData.get("contact_email") ?? "").trim();
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: "Enter a valid contact email." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("site_settings")
    .update({
      business_name: businessName,
      whatsapp_number: whatsapp || null,
      contact_phone: String(formData.get("contact_phone") ?? "").trim() || null,
      contact_email: email || null,
      address: String(formData.get("address") ?? "").trim() || null,
      response_note: String(formData.get("response_note") ?? "").trim() || null,
    })
    .eq("id", true);

  if (error) return { error: error.message };
  revalidateSettings();
  return { success: true };
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function updateStayDefaults(formData: FormData): Promise<ActionResult> {
  const checkIn = String(formData.get("default_check_in_time") ?? "").trim();
  const checkOut = String(formData.get("default_check_out_time") ?? "").trim();
  if (!TIME_RE.test(checkIn) || !TIME_RE.test(checkOut)) {
    return { error: "Enter valid times for both fields." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("site_settings")
    .update({
      default_check_in_time: checkIn,
      default_check_out_time: checkOut,
    })
    .eq("id", true);

  if (error) return { error: error.message };
  revalidateSettings();
  return { success: true };
}

/** "08:00" -> "8am", "21:00" -> "9pm", "13:30" -> "1:30pm". */
function formatHour12(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h < 12 ? "am" : "pm";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour12}${period}` : `${hour12}:${String(m).padStart(2, "0")}${period}`;
}

/**
 * The homepage quotes these facts in several sections at once (the trust
 * ribbon's cancellation line, the hero's response-time chip, the FAQ, the
 * Shravan advance-payment line) via {tokens} — see
 * docs/homepage-builder-v2-plan.md §2 — so they live here once rather than
 * inside any single section, and can't drift between sections the way a
 * hardcoded number copy-pasted into each one could.
 *
 * Reply hours are entered as two <input type="time"> fields rather than as a
 * display string ("8am") AND a separate 24-hour number: deriving both from
 * one value closes off the drift the old two-representation config invited —
 * the sticky bar's "open now" pip promises a response time, so it must never
 * disagree with the hours shown next to it.
 */
export async function updateHostAndPromises(formData: FormData): Promise<ActionResult> {
  const hoursStart = String(formData.get("hours_start_24") ?? "").trim();
  const hoursEnd = String(formData.get("hours_end_24") ?? "").trim();
  if (!TIME_RE.test(hoursStart) || !TIME_RE.test(hoursEnd)) {
    return { error: "Enter valid reply hours." };
  }

  const replyMinutes = Number(formData.get("reply_minutes"));
  if (!Number.isInteger(replyMinutes) || replyMinutes <= 0 || replyMinutes > 1440) {
    return { error: "Reply time must be a whole number of minutes." };
  }

  const cancelDays = Number(formData.get("cancel_days"));
  if (!Number.isInteger(cancelDays) || cancelDays < 0 || cancelDays > 90) {
    return { error: "Cancellation window must be 0–90 days." };
  }

  const advancePct = Number(formData.get("advance_pct"));
  if (!Number.isInteger(advancePct) || advancePct < 0 || advancePct > 100) {
    return { error: "Advance must be a percentage between 0 and 100." };
  }

  const hotelRoomRate = Number(formData.get("hotel_room_rate"));
  if (!Number.isFinite(hotelRoomRate) || hotelRoomRate < 0) {
    return { error: "Enter a valid hotel room rate." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("site_settings")
    .update({
      host_name: String(formData.get("host_name") ?? "").trim() || null,
      host_years: String(formData.get("host_years") ?? "").trim() || null,
      reply_minutes: replyMinutes,
      hours_start: formatHour12(hoursStart),
      hours_end: formatHour12(hoursEnd),
      hours_start_hour: Number(hoursStart.split(":")[0]),
      hours_end_hour: Number(hoursEnd.split(":")[0]),
      cancel_days: cancelDays,
      advance_pct: advancePct,
      hotel_room_rate: hotelRoomRate,
      maps_url: String(formData.get("maps_url") ?? "").trim() || null,
      instagram_url: String(formData.get("instagram_url") ?? "").trim() || null,
      facebook_url: String(formData.get("facebook_url") ?? "").trim() || null,
    })
    .eq("id", true);

  if (error) return { error: error.message };
  revalidateSettings();
  return { success: true };
}

export async function addCalendarSource(
  propertyId: string,
  formData: FormData,
): Promise<ActionResult> {
  const platform = String(formData.get("platform") ?? "") as CalendarPlatform;
  const icalUrl = String(formData.get("ical_url") ?? "").trim();
  if (!icalUrl) return { error: "Paste the iCal URL from the platform." };
  if (!/^https?:\/\//i.test(icalUrl)) return { error: "That doesn't look like a URL." };

  const supabase = await createClient();
  const { error } = await supabase.from("calendar_sources").insert({
    property_id: propertyId,
    platform,
    ical_url: icalUrl,
  });
  if (error) return { error: error.message };

  revalidatePath("/admin/settings");
  return { success: true };
}

export async function deleteCalendarSource(sourceId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("calendar_sources").delete().eq("id", sourceId);
  if (error) return { error: error.message };

  revalidatePath("/admin/settings");
  return { success: true };
}

export async function syncSourceNow(
  sourceId: string,
): Promise<ActionResult & { imported?: number }> {
  const result = await syncCalendarSource(sourceId);
  revalidatePath("/admin/settings");
  revalidatePath("/admin/calendar");
  if (!result.success) return { error: result.error ?? "Sync failed." };
  return { success: true, imported: result.imported };
}

// ---------------------------------------------------------------------------
// Add-on catalog — the shared list; which properties offer each item is
// chosen on the listing itself (components/admin/tabs/addons-tab.tsx).
// ---------------------------------------------------------------------------

function revalidateAddons() {
  revalidatePath("/admin/settings");
  revalidatePath("/admin/listings", "layout");
  revalidatePublicProperties();
}

export async function addAddonService(formData: FormData): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Enter a name for the add-on." };

  const priceRaw = String(formData.get("price") ?? "").trim();
  const price = priceRaw === "" ? null : Number(priceRaw);
  if (price !== null && !Number.isFinite(price)) return { error: "Enter a valid price." };

  const priceUnit = String(formData.get("price_unit") ?? "").trim();

  const supabase = await createClient();
  const { count } = await supabase
    .from("addon_services")
    .select("id", { count: "exact", head: true });

  const { error } = await supabase.from("addon_services").insert({
    name,
    description: String(formData.get("description") ?? "").trim() || null,
    price,
    price_unit: priceUnit || "per booking",
    sort_order: count ?? 0,
  });
  if (error) return { error: error.message };

  revalidateAddons();
  return { success: true };
}

export async function updateAddonService(
  addonId: string,
  formData: FormData,
): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Enter a name for the add-on." };

  const priceRaw = String(formData.get("price") ?? "").trim();
  const price = priceRaw === "" ? null : Number(priceRaw);
  if (price !== null && !Number.isFinite(price)) return { error: "Enter a valid price." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("addon_services")
    .update({
      name,
      description: String(formData.get("description") ?? "").trim() || null,
      price,
      price_unit: String(formData.get("price_unit") ?? "").trim() || "per booking",
      active: formData.get("active") === "on",
    })
    .eq("id", addonId);
  if (error) return { error: error.message };

  revalidateAddons();
  return { success: true };
}

export async function deleteAddonService(addonId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("addon_services").delete().eq("id", addonId);
  if (error) return { error: error.message };

  revalidateAddons();
  return { success: true };
}

export async function moveAddonService(
  addonId: string,
  direction: "up" | "down",
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("addon_services")
    .select("id, sort_order")
    .order("sort_order");

  if (!rows) return { error: "Not found." };
  const index = rows.findIndex((r) => r.id === addonId);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapIndex < 0 || swapIndex >= rows.length) {
    return { success: true }; // already at an edge — nothing to do
  }

  const a = rows[index];
  const b = rows[swapIndex];
  await Promise.all([
    supabase.from("addon_services").update({ sort_order: b.sort_order }).eq("id", a.id),
    supabase.from("addon_services").update({ sort_order: a.sort_order }).eq("id", b.id),
  ]);

  revalidateAddons();
  return { success: true };
}
