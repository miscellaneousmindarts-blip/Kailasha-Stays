import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { publicEnv } from "@/lib/env";
import type { Database } from "@/lib/types/database";

/**
 * Server client bound to the request's cookies — carries the admin session in
 * Server Components, Server Actions and Route Handlers. Still anon-key based,
 * so RLS applies exactly as it does in the browser.
 *
 * Next 16: `cookies()` is async, so this function is async too.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    publicEnv.supabaseUrl,
    publicEnv.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component, where cookies are read-only.
            // Session refresh is handled in proxy.ts, so this is safe to ignore.
          }
        },
      },
    },
  );
}
