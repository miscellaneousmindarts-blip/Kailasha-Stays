import "server-only";

import type { createClient } from "@/lib/supabase/server";

/**
 * The tenant the currently signed-in admin belongs to.
 *
 * A stand-in for phase B4's requireTenant(). It exists because RLS alone
 * isn't enough for a *write*: a superadmin belongs to every tenant (see
 * current_tenant_ids() in 0011_tenants.sql), so an UPDATE scoped only by RLS
 * would touch every tenant's row at once instead of just the one being
 * edited. Reads don't have this problem — SELECT ... LIMIT/maybeSingle()
 * against RLS is fine as long as the caller belongs to exactly one tenant,
 * which is true for every admin today.
 *
 * Picks the first membership row, which is correct today because nobody has
 * more than one. Multi-tenant staff accounts and impersonation (B6) are
 * exactly what make "first" wrong, and exactly what requireTenant() will
 * replace this with — at which point every call site of this function
 * becomes a call site of that instead.
 */
export async function getCurrentTenantId(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data, error } = await supabase
    .from("tenant_members")
    .select("tenant_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Could not resolve tenant: ${error.message}`);
  if (!data) throw new Error("This account is not a member of any tenant.");

  return data.tenant_id;
}
