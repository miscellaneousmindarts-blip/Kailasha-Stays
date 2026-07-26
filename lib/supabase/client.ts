"use client";

import { createBrowserClient } from "@supabase/ssr";

import { publicEnv } from "@/lib/env";
import type { Database } from "@/lib/types/database";

/**
 * Browser client — anon key only, every read/write is subject to RLS.
 * Used by the public enquiry form and by the admin panel after login.
 */
export function createClient() {
  return createBrowserClient<Database>(
    publicEnv.supabaseUrl,
    publicEnv.supabaseAnonKey,
  );
}
