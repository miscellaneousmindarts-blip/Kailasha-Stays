import { cache } from "react";

import { createPublicClient } from "@/lib/supabase/public";
import type { GuestBookingBundle } from "@/lib/types/guest-portal";

/**
 * Fetches the full guest-portal bundle for a token via the SECURITY DEFINER
 * get_booking_by_token RPC. Returns null for an unknown, cancelled or
 * expired token — the RPC itself is the source of truth on validity, this
 * is just a thin typed wrapper.
 *
 * `cache` here is per-request de-duplication only (the layout now needs the
 * bundle for the booking's own branding, alongside the page's existing call
 * for content) — NOT a caching layer across visits. Every fresh request still
 * hits the RPC and sees live data (billing, add-on status, document uploads).
 */
export const getBookingBundle = cache(async (
  token: string,
): Promise<GuestBookingBundle | null> => {
  if (!token || token.length < 8) return null;

  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("get_booking_by_token", {
    p_token: token,
  });

  if (error || !data) return null;
  return data as unknown as GuestBookingBundle;
});
