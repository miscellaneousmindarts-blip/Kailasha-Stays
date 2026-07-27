"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { syncCalendarSource } from "@/lib/admin/ical-sync";
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
