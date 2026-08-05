import "server-only";

import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { TenantRole, TenantStatus } from "@/lib/types/database";

export type AdminTenant = {
  id: string;
  slug: string;
  name: string;
  status: TenantStatus;
};

export type AdminContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: User;
  tenant: AdminTenant;
  role: TenantRole;
  isSuperadmin: boolean;
};

/**
 * The single place that decides whether the current request may see admin
 * pages, AND which tenant it is acting on.
 *
 * No session → straight to login. A session that isn't in admin_users →
 * notFound(), so the existence of /admin is never confirmed to a random
 * logged-in (non-admin) account.
 *
 * ── Why the tenant is resolved here rather than left to RLS ──────────────
 *
 * RLS scopes to current_tenant_ids(), which for a SUPERADMIN is *every*
 * tenant (0011_tenants.sql — deliberately, so support can fix a customer's
 * data). That makes RLS alone the wrong tool for the admin panel: an
 * unscoped `select * from bookings` would hand a superadmin every tenant's
 * bookings in one list, and an unscoped bulk write — reorderSections is the
 * sharp example — would renumber every tenant's homepage at once.
 *
 * So RLS answers "may I touch this row at all", and this answers "which
 * tenant am I acting as". Both are needed; neither substitutes for the other.
 *
 * `cache` de-duplicates across a render pass, so every query in
 * lib/admin/queries.ts can call this without extra auth round trips.
 */
export const requireTenant = cache(async (): Promise<AdminContext> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("user_id, is_superadmin")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminRow) notFound();

  // Which tenant this admin is acting on. Phase B6 adds impersonation, where
  // a superadmin picks a tenant and this reads that choice from a signed
  // cookie instead; until then it is simply the account's own membership.
  const { data: membership, error } = await supabase
    .from("tenant_members")
    .select("role, tenants(id, slug, name, status)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Could not resolve tenant: ${error.message}`);
  if (!membership?.tenants) {
    // Reachable only by an admin_users row with no tenant_members row, which
    // 0011 never creates. Fail loudly rather than falling back to "some
    // tenant" — that is how one operator ends up editing another's site.
    throw new Error(
      "This admin account is not a member of any tenant. Add a tenant_members row for it.",
    );
  }

  const tenant = membership.tenants as unknown as AdminTenant;

  return {
    supabase,
    user,
    tenant,
    role: membership.role as TenantRole,
    isSuperadmin: adminRow.is_superadmin,
  };
});

/**
 * For the handful of call sites that only care about "is this an admin at
 * all" — the dashboard layout and the login page's already-signed-in
 * redirect. Everything that touches tenant data should use requireTenant().
 */
export async function requireAdmin() {
  const { supabase, user } = await requireTenant();
  return { supabase, user };
}
