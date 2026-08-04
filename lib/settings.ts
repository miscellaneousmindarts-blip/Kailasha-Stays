import { cache } from "react";

import { createPublicClient } from "@/lib/supabase/public";
import { getPrimaryTenantId } from "@/lib/tenant";
import type { SiteSettings } from "@/lib/types/database";

export const DEFAULT_SETTINGS: SiteSettings = {
  // Only ever read for display when no tenant/row resolves — never written
  // back, so an empty id can't collide with or masquerade as a real tenant.
  tenant_id: "",
  business_name: "Stays in Vrindavan",
  whatsapp_number: null,
  contact_phone: null,
  contact_email: null,
  address: null,
  response_note: null,
  default_check_in_time: "13:00",
  default_check_out_time: "11:00",
  reply_minutes: 15,
  hours_start: "8am",
  hours_end: "9pm",
  hours_start_hour: 8,
  hours_end_hour: 21,
  cancel_days: 7,
  advance_pct: 25,
  hotel_room_rate: 2500,
  host_name: null,
  host_years: null,
  maps_url: null,
  instagram_url: null,
  facebook_url: null,
  updated_at: new Date(0).toISOString(),
};

/**
 * The current tenant's site_settings row — business name, WhatsApp number,
 * contact details. Owned by the admin panel, never by environment variables.
 *
 * `cache` de-duplicates this across a single render pass, so a page can call it
 * from several components without extra round trips.
 */
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  const tenantId = await getPrimaryTenantId();
  if (!tenantId) return DEFAULT_SETTINGS;

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select("*")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error || !data) return DEFAULT_SETTINGS;
  return data;
});
