import "server-only";

import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Tenant } from "@/lib/types/database";
import type { ImpersonationEntry, TenantRow } from "@/lib/superadmin/types";

/**
 * ── This module is deliberately NOT tenant-scoped ────────────────────────
 *
 * Every query in lib/admin/queries.ts filters by tenant.id, because the admin
 * panel is always acting as exactly one tenant (phase B4). The superadmin
 * console is the one place that legitimately spans all of them, so it lives
 * in its own module rather than being mixed in as exceptions — the split is
 * the documentation. If a cross-tenant query ever appears under lib/admin/,
 * that's a bug; here, it's the whole point.
 *
 * RLS already permits it: current_tenant_ids() returns every tenant for a
 * superadmin (0011). requireSuperadmin() is what stops anyone else reaching
 * these functions at all.
 */

export type SuperadminContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: User;
};

/**
 * notFound() rather than a 403 for a signed-in non-superadmin, matching how
 * /admin already hides itself from a signed-in non-admin: the existence of
 * the console isn't confirmed to someone who has no business knowing about it.
 */
export const requireSuperadmin = cache(async (): Promise<SuperadminContext> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("is_superadmin")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminRow?.is_superadmin) notFound();

  return { supabase, user };
});

/** Every tenant, with the counts that make the list worth looking at. */
export async function listTenants(): Promise<TenantRow[]> {
  const { supabase } = await requireSuperadmin();

  const [tenantsResult, membersResult, propertiesResult, bookingsResult] =
    await Promise.all([
      supabase.from("tenants").select("*").order("created_at"),
      supabase.from("tenant_members").select("tenant_id, user_id"),
      supabase.from("properties").select("tenant_id"),
      supabase.from("bookings").select("tenant_id"),
    ]);

  if (tenantsResult.error) {
    throw new Error(`Could not load tenants: ${tenantsResult.error.message}`);
  }

  // admin_users carries the email; tenant_members carries the pairing. Joined
  // here rather than in SQL because tenant_members has no FK into
  // admin_users (it references auth.users), so PostgREST can't embed it.
  const { data: admins } = await supabase.from("admin_users").select("user_id, email");
  const emailByUser = new Map((admins ?? []).map((a) => [a.user_id, a.email ?? ""]));

  const countBy = (rows: { tenant_id: string }[] | null) => {
    const counts = new Map<string, number>();
    for (const row of rows ?? []) {
      counts.set(row.tenant_id, (counts.get(row.tenant_id) ?? 0) + 1);
    }
    return counts;
  };

  const propertyCounts = countBy(propertiesResult.data);
  const bookingCounts = countBy(bookingsResult.data);

  const ownersByTenant = new Map<string, string[]>();
  for (const m of membersResult.data ?? []) {
    const email = emailByUser.get(m.user_id);
    if (!email) continue;
    const list = ownersByTenant.get(m.tenant_id) ?? [];
    list.push(email);
    ownersByTenant.set(m.tenant_id, list);
  }

  return (tenantsResult.data ?? []).map((t) => ({
    ...(t as Tenant),
    owners: ownersByTenant.get(t.id) ?? [],
    propertyCount: propertyCounts.get(t.id) ?? 0,
    bookingCount: bookingCounts.get(t.id) ?? 0,
  }));
}

/** Most recent impersonation sessions, for the console's audit panel. */
export async function listImpersonationLog(limit = 25): Promise<ImpersonationEntry[]> {
  const { supabase } = await requireSuperadmin();
  const { data, error } = await supabase
    .from("impersonation_log")
    .select("id, actor_email, tenant_slug, started_at, ended_at")
    .order("started_at", { ascending: false })
    .limit(limit);

  // The table arrives in migration 0017; an un-migrated database shows an
  // empty panel rather than taking the whole console down.
  if (error) return [];
  return data as ImpersonationEntry[];
}
