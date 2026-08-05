"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireSuperadmin } from "@/lib/superadmin/queries";
import {
  clearActingTenantId,
  readActingTenantId,
  setActingTenantId,
} from "@/lib/impersonation";
import { slugify } from "@/lib/slug";
import type { TenantStatus } from "@/lib/types/database";

export type ActionResult = { error?: string; success?: boolean };

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
  // shouldn't have a live public site. B7's flow is what moves it forward.
  const { error } = await supabase
    .from("tenants")
    .insert({ name, slug, status: "invited" });

  if (error) return { error: error.message };

  revalidatePath("/superadmin");
  return { success: true };
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
