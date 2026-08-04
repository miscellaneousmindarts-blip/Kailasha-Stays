import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { publicEnv } from "@/lib/env";

/**
 * Refreshes the Supabase auth session cookie on every request. Server
 * Components can't write cookies, so without this, sessions would silently
 * expire mid-visit instead of being renewed. Proxy only does this optimistic
 * cookie refresh — the real admin_users membership check happens in
 * app/admin/(dashboard)/layout.tsx, as close to the data as possible.
 *
 * `makeResponse` exists so a request that is being rewritten to another route
 * still gets its session refreshed. Without it, the tenant rewrite in
 * proxy.ts would return a response this function never touched, and an admin
 * who spent a while on the public site would quietly fall out of their
 * session — a regression with no error message attached to it.
 */
export async function updateSession(
  request: NextRequest,
  makeResponse: () => NextResponse = () => NextResponse.next({ request }),
) {
  let response = makeResponse();

  const supabase = createServerClient(
    publicEnv.supabaseUrl,
    publicEnv.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = makeResponse();
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  await supabase.auth.getUser();

  return response;
}
