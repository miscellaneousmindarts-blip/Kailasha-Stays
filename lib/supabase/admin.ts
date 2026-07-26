import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { publicEnv, serverEnv } from "@/lib/env";
import type { Database } from "@/lib/types/database";

/**
 * Service-role client — BYPASSES RLS. Never import this into anything that can
 * reach the browser. Only for: the iCal export route, the guest-upload flow,
 * signed URLs for guest documents, and scheduled sync jobs.
 *
 * Every call site must do its own authorisation check first (admin session,
 * portal token, or export secret).
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    publicEnv.supabaseUrl,
    serverEnv.serviceRoleKey,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}
