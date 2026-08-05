"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireSuperadmin } from "@/lib/superadmin/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicEnv } from "@/lib/env";
import {
  clearActingTenantId,
  readActingTenantId,
  setActingTenantId,
} from "@/lib/impersonation";
import { slugify } from "@/lib/slug";
import type { TenantStatus } from "@/lib/types/database";

export type ActionResult = { error?: string; success?: boolean };

/**
 * Invite an owner and link them to a tenant.
 *
 * Uses the service-role client, not the caller's session — inviteUserByEmail
 * is an admin-only Supabase API with no RLS-equivalent, and it also has to
 * write admin_users/tenant_members for a user_id that doesn't exist yet from
 * the caller's own session's point of view.
 *
 * admin_users has otherwise never been written by the app (existing admins
 * were inserted by hand in the SQL editor) — this is what makes onboarding an
 * owner self-service instead of a support request.
 */
async function inviteOwnerToTenant(
  tenantId: string,
  tenantSlug: string,
  email: string,
): Promise<ActionResult> {
  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${publicEnv.siteUrl}/admin/auth/confirm`,
  });
  if (error) return { error: error.message };

  const user = data.user;
  if (!user) return { error: "Invite sent, but no user record came back." };

  const { error: adminError } = await admin
    .from("admin_users")
    .upsert({ user_id: user.id, email: user.email ?? email }, { onConflict: "user_id" });
  if (adminError) return { error: `Invited, but couldn't grant admin access: ${adminError.message}` };

  const { error: memberError } = await admin
    .from("tenant_members")
    .upsert(
      { tenant_id: tenantId, user_id: user.id, role: "owner" },
      { onConflict: "tenant_id,user_id" },
    );
  if (memberError) {
    return { error: `Invited, but couldn't link them to ${tenantSlug}: ${memberError.message}` };
  }

  return { success: true };
}

const VALID_STATUSES: TenantStatus[] = [
  "invited",
  "awaiting_payment",
  "active",
  "suspended",
  "cancelled",
];

export async function createTenant(formData: FormData): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Enter a business name." };
  if (name.length > 160) return { error: "Keep the name under 160 characters." };

  const ownerEmail = String(formData.get("owner_email") ?? "")
    .trim()
    .toLowerCase();

  const requested = String(formData.get("slug") ?? "").trim();
  const base = slugify(requested || name);
  if (!base) return { error: "That name doesn't produce a usable URL — set a slug manually." };

  const { supabase } = await requireSuperadmin();

  // Slug is the tenant's public URL segment and is globally unique, so a
  // collision has to be resolved before insert rather than surfaced as a
  // constraint error the operator has to decode.
  let slug = base;
  for (let suffix = 2; suffix <= 50; suffix++) {
    const { data: taken } = await supabase
      .from("tenants")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!taken) break;
    slug = `${base}-${suffix}`;
  }

  // Starts as 'invited', not 'active': a tenant with no owner and no payment
  // shouldn't have a live public site. Manual confirmation of payment (the
  // status dropdown below) is what moves it to 'active'.
  const { data: tenant, error } = await supabase
    .from("tenants")
    .insert({ name, slug, status: "invited" })
    .select("id, slug")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/superadmin");

  if (!ownerEmail) return { success: true };

  // The tenant now exists either way — a failed invite is reported so the
  // operator can retry it from the tenant's own row, not lost.
  const inviteResult = await inviteOwnerToTenant(tenant.id, tenant.slug, ownerEmail);
  if (inviteResult.error) {
    return { error: `Tenant created, but the invite failed: ${inviteResult.error}` };
  }

  revalidatePath("/superadmin");
  return { success: true };
}

export async function inviteOwner(tenantId: string, email: string): Promise<ActionResult> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return { error: "Enter an email address." };

  const { supabase } = await requireSuperadmin();
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, slug")
    .eq("id", tenantId)
    .maybeSingle();
  if (!tenant) return { error: "That tenant no longer exists." };

  const result = await inviteOwnerToTenant(tenant.id, tenant.slug, trimmed);
  if (result.success) revalidatePath("/superadmin");
  return result;
}

export async function setTenantStatus(
  tenantId: string,
  status: TenantStatus,
): Promise<ActionResult> {
  if (!VALID_STATUSES.includes(status)) return { error: "Unknown status." };

  const { supabase } = await requireSuperadmin();
  const { error } = await supabase
    .from("tenants")
    .update({ status })
    .eq("id", tenantId);

  if (error) return { error: error.message };

  revalidatePath("/superadmin");
  // A suspended tenant's public site must stop serving immediately, and
  // getTenantBySlug() only resolves active tenants — so the public routes
  // need their cache dropped for the change to actually take effect.
  revalidatePath("/(public)", "layout");
  return { success: true };
}

/**
 * Start acting as a tenant. Records the session first, then sets the cookie —
 * so a failure to write the audit row means impersonation doesn't begin,
 * rather than access being granted with no trace of it.
 */
export async function startImpersonation(tenantId: string): Promise<ActionResult> {
  const { supabase, user } = await requireSuperadmin();

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, slug")
    .eq("id", tenantId)
    .maybeSingle();
  if (!tenant) return { error: "That tenant no longer exists." };

  const { error } = await supabase.from("impersonation_log").insert({
    actor_id: user.id,
    actor_email: user.email ?? null,
    tenant_id: tenant.id,
    tenant_slug: tenant.slug,
  });
  if (error) return { error: `Couldn't record the session: ${error.message}` };

  await setActingTenantId(tenant.id);
  redirect("/admin");
}

/**
 * Stop impersonating. The cookie is cleared even if closing out the log row
 * fails — being stuck inside someone else's account is worse than an audit
 * row with a missing ended_at, and the row's existence is the part that
 * matters for accountability.
 */
export async function stopImpersonation(): Promise<ActionResult> {
  const { supabase, user } = await requireSuperadmin();
  const actingTenantId = await readActingTenantId();

  await clearActingTenantId();

  if (actingTenantId) {
    await supabase
      .from("impersonation_log")
      .update({ ended_at: new Date().toISOString() })
      .eq("actor_id", user.id)
      .eq("tenant_id", actingTenantId)
      .is("ended_at", null);
  }

  revalidatePath("/admin", "layout");
  redirect("/superadmin");
}
