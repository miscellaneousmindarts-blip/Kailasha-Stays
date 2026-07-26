import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { publicEnv } from "@/lib/env";
import type { Database } from "@/lib/types/database";

/**
 * Cookie-free anon client for public, cacheable reads (property pages, site
 * settings). No session is attached, so pages using it can be statically
 * rendered and revalidated instead of going dynamic on every request.
 *
 * RLS still applies: this sees exactly what a logged-out visitor sees.
 */
export function createPublicClient() {
  return createSupabaseClient<Database>(
    publicEnv.supabaseUrl,
    publicEnv.supabaseAnonKey,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
