import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Landing point for the link in a Supabase password-recovery email. Turns the
 * one-time credential in that link into a real session, then sends the admin
 * on to /admin/reset-password to choose a new password.
 *
 * Two link shapes are accepted, so this works whichever email template the
 * project uses:
 *   - ?code=...                  the default {{ .ConfirmationURL }} template
 *                                (PKCE — only valid in the same browser that
 *                                requested the reset, which holds the verifier
 *                                cookie)
 *   - ?token_hash=...&type=...   a {{ .TokenHash }} template — works on any
 *                                device, so the email can be opened on a phone
 *
 * Absolute URLs are built from the configured site URL rather than the
 * incoming request, which behind a proxy can carry an internal host.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const type = params.get("type");

  const supabase = await createClient();
  let verified = false;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    verified = !error;
  } else if (tokenHash && type === "recovery") {
    const { error } = await supabase.auth.verifyOtp({
      type: "recovery",
      token_hash: tokenHash,
    });
    verified = !error;
  }

  const destination = verified
    ? "/admin/reset-password"
    : "/admin/forgot-password?expired=1";

  return NextResponse.redirect(new URL(destination, publicEnv.siteUrl));
}
