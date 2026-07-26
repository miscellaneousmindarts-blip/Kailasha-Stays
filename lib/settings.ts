import { cache } from "react";

import { createPublicClient } from "@/lib/supabase/public";
import type { SiteSettings } from "@/lib/types/database";

export const DEFAULT_SETTINGS: SiteSettings = {
  id: true,
  business_name: "Stays in Vrindavan",
  whatsapp_number: null,
  contact_phone: null,
  contact_email: null,
  address: null,
  response_note: null,
  updated_at: new Date(0).toISOString(),
};

/**
 * The single site_settings row — business name, WhatsApp number, contact
 * details. Owned by the admin panel, never by environment variables.
 *
 * `cache` de-duplicates this across a single render pass, so a page can call it
 * from several components without extra round trips.
 */
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select("*")
    .maybeSingle();

  if (error || !data) return DEFAULT_SETTINGS;
  return data;
});
