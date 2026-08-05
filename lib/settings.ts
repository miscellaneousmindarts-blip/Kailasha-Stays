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
  logo_path: null,
  favicon_path: null,
  brand_color: null,
  legal_name: null,
  footer_note: null,
  updated_at: new Date(0).toISOString(),
};

/**
 * A tenant's site_settings row — business name, WhatsApp number, contact
 * details, branding. Owned by the admin panel, never by environment
 * variables.
 *
 * `tenantId` is optional because two routes genuinely have no tenant in the
 * URL to resolve one from: /stay/[token] (a booking link handed to a guest
 * directly, unprefixed on purpose — see B5's note on why its branding isn't
 * yet the booking's own tenant) and the apex sitemap. Every other caller
 * passes its resolved tenant explicitly.
 *
 * `cache` de-duplicates this across a single render pass, so a page can call it
 * from several components without extra round trips.
 */
export const getSiteSettings = cache(
  async (tenantId?: string): Promise<SiteSettings> => {
    const id = tenantId ?? (await getPrimaryTenantId());
    if (!id) return DEFAULT_SETTINGS;

    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("site_settings")
      .select("*")
      .eq("tenant_id", id)
      .maybeSingle();

    if (error || !data) return DEFAULT_SETTINGS;
    return data;
  },
);
