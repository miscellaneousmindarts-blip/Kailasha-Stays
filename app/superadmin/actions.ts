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
import { defaultTenantHost, HOSTNAME_RE, isReservedLabel } from "@/lib/hosts";
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

  // The slug becomes a subdomain, so a reserved label here would claim a
  // hostname the platform itself needs — `www` most of all. lib/hosts.ts
  // refuses to route these; this refuses to create them.
  if (isReservedLabel(base)) {
    return { error: `"${base}" is reserved for the platform — choose a different slug.` };
  }

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
  // shouldn't have a live public site. Manual confirmation of payment is
  // what moves it to 'active' (Edit details, or the quick Activate action).
  //
  // canonical_host is set here, not left null — this is the actual point of
  // phase C: a new tenant gets its own subdomain from the moment it exists,
  // rather than sitting on the legacy /s/{slug} path until someone remembers
  // to flip it. defaultTenantHost() returns null only when no platform
  // domain is configured at all, which the superadmin console has no UI for
  // fixing anyway — falling back to the old path-based site is the right
  // behaviour for that case, not an error.
  const { data: tenant, error } = await supabase
    .from("tenants")
    .insert({ name, slug, status: "invited", canonical_host: defaultTenantHost(slug) })
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

/**
 * Edit a tenant's identity: name, slug, canonical host, status. One form
 * rather than separate actions per field, because these four are edited
 * together in the console (phase C5) and a single round trip means a
 * half-applied edit can't happen.
 */
export async function updateTenant(
  tenantId: string,
  formData: FormData,
): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Enter a business name." };
  if (name.length > 160) return { error: "Keep the name under 160 characters." };

  const slugRaw = String(formData.get("slug") ?? "").trim();
  const slug = slugify(slugRaw);
  if (!slug) return { error: "That doesn't produce a usable URL — set a slug manually." };
  if (isReservedLabel(slug)) {
    return { error: `"${slug}" is reserved for the platform — choose a different slug.` };
  }

  const canonicalHostRaw = String(formData.get("canonical_host") ?? "")
    .trim()
    .toLowerCase();
  if (canonicalHostRaw && !HOSTNAME_RE.test(canonicalHostRaw)) {
    return { error: "That doesn't look like a valid hostname, e.g. archana.deogharbnb.space." };
  }

  const status = String(formData.get("status") ?? "") as TenantStatus;
  if (!VALID_STATUSES.includes(status)) return { error: "Unknown status." };

  const { supabase } = await requireSuperadmin();
  const { error } = await supabase
    .from("tenants")
    .update({
      name,
      slug,
      canonical_host: canonicalHostRaw || null,
      status,
    })
    .eq("id", tenantId);

  if (error) {
    if (error.code === "23505") {
      return { error: "That slug or hostname is already used by another tenant." };
    }
    return { error: error.message };
  }

  revalidatePath("/superadmin");
  // Slug, host and status can all change what the public site resolves to
  // or whether it serves at all — every one of those is read by public
  // routes, so their cache has to drop along with the admin console's.
  revalidatePath("/(public)", "layout");
  return { success: true };
}

/**
 * Hard delete — the guarded, irreversible action behind typing the exact
 * business name (phase C5). Storage files and orphaned owner accounts are
 * cleaned up too; neither is covered by the database cascade, which only
 * reaches rows, not files in Storage or accounts in auth.users.
 *
 * Order matters: every path/user this needs is READ before the tenant row
 * is deleted, because deleting it cascades away the very rows (properties,
 * tenant_members, guest_documents, ...) that name them. There is no
 * recovering that list after the fact.
 */
export async function deleteTenantForever(
  tenantId: string,
  confirmName: string,
): Promise<ActionResult> {
  await requireSuperadmin();
  const admin = createAdminClient();

  const { data: tenant } = await admin
    .from("tenants")
    .select("id, name")
    .eq("id", tenantId)
    .maybeSingle();
  if (!tenant) return { error: "That tenant no longer exists." };

  if (confirmName.trim() !== tenant.name) {
    return { error: "That doesn't match the business name exactly." };
  }

  const [
    { data: properties },
    { data: homepageImages },
    { data: propertyImages },
    { data: guestDocs },
    { data: settings },
    { data: members },
  ] = await Promise.all([
    admin.from("properties").select("room_service_pdf_path").eq("tenant_id", tenantId),
    admin.from("homepage_images").select("storage_path").eq("tenant_id", tenantId),
    admin.from("property_images").select("storage_path").eq("tenant_id", tenantId),
    admin.from("guest_documents").select("storage_path").eq("tenant_id", tenantId),
    admin
      .from("site_settings")
      .select("logo_path, favicon_path")
      .eq("tenant_id", tenantId)
      .maybeSingle(),
    admin.from("tenant_members").select("user_id").eq("tenant_id", tenantId),
  ]);

  const roomServicePaths = (properties ?? [])
    .map((p) => p.room_service_pdf_path)
    .filter((p): p is string => Boolean(p));
  const memberIds = (members ?? []).map((m) => m.user_id);

  const { error: deleteError } = await admin.from("tenants").delete().eq("id", tenantId);
  if (deleteError) return { error: deleteError.message };

  // Best-effort from here on: the tenant is already gone and cannot be
  // un-deleted, so a failure cleaning up a leftover file or a login is not
  // worth reporting as if the whole operation failed.
  await Promise.all([
    propertyImages?.length
      ? admin.storage.from("property-images").remove(propertyImages.map((i) => i.storage_path))
      : null,
    homepageImages?.length
      ? admin.storage.from("homepage-media").remove(homepageImages.map((i) => i.storage_path))
      : null,
    guestDocs?.length
      ? admin.storage.from("guest-docs").remove(guestDocs.map((d) => d.storage_path))
      : null,
    roomServicePaths.length
      ? admin.storage.from("property-documents").remove(roomServicePaths)
      : null,
    settings?.logo_path
      ? admin.storage.from("homepage-media").remove([settings.logo_path])
      : null,
    settings?.favicon_path
      ? admin.storage.from("homepage-media").remove([settings.favicon_path])
      : null,
  ]);

  // Orphaned owners: anyone who belonged ONLY to this tenant, checked AFTER
  // the cascade — a user's remaining tenant_members rows are exactly the
  // tenants they still belong to, so this is the one moment that count is
  // meaningful. A superadmin is never auto-deleted this way, even if they
  // happened to also be a member here: this cleans up customer accounts,
  // not the operator's own login.
  for (const userId of memberIds) {
    const [{ count }, { data: adminRow }] = await Promise.all([
      admin
        .from("tenant_members")
        .select("tenant_id", { count: "exact", head: true })
        .eq("user_id", userId),
      admin.from("admin_users").select("is_superadmin").eq("user_id", userId).maybeSingle(),
    ]);
    if ((count ?? 0) > 0) continue;
    if (adminRow?.is_superadmin) continue;

    await admin.from("admin_users").delete().eq("user_id", userId);
    await admin.auth.admin.deleteUser(userId);
  }

  revalidatePath("/superadmin");
  revalidatePath("/(public)", "layout");
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
