"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";

export type ForgotPasswordState = { error?: string; sent?: boolean } | undefined;

export async function requestPasswordReset(
  _prevState: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!email) return { error: "Enter your email address." };

  // Only ever mail a real admin — this endpoint is public, so without the
  // check it would happily send Supabase recovery mail to any registered
  // account (or be used to spam arbitrary addresses through our project).
  // The admin table is a handful of rows, so compare in JS rather than
  // through an ilike filter, which would treat % and _ as wildcards.
  const admin = createAdminClient();
  const { data: admins } = await admin.from("admin_users").select("user_id, email");
  const isAdmin = (admins ?? []).some(
    (a) => a.email?.trim().toLowerCase() === email,
  );

  if (isAdmin) {
    const supabase = await createClient();
    // Ignore the result deliberately: a failure here (rate limit, unknown
    // address) must look identical to success from the outside.
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${publicEnv.siteUrl}/admin/auth/confirm`,
    });
  }

  // Always the same answer, so this can't be used to discover which
  // addresses are admins.
  return { sent: true };
}
