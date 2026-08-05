"use server";

import { redirect } from "next/navigation";

import { requireTenant } from "@/lib/admin/auth";
import { slugify } from "@/lib/slug";

export type CreateListingState = { error: string } | undefined;

export async function createListing(
  _prevState: CreateListingState,
  formData: FormData,
): Promise<CreateListingState> {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Enter a title for the property." };

  const { supabase, tenant } = await requireTenant();
  const base = slugify(title) || "property";

  // Scoped to the tenant because slug is unique per tenant, not globally
  // (0012). Unscoped, this would both refuse a slug another owner happens to
  // use and — for a superadmin, who can see every tenant — throw from
  // maybeSingle() the moment two tenants share one.
  let slug = base;
  for (let suffix = 2; suffix <= 20; suffix++) {
    const { data: existing } = await supabase
      .from("properties")
      .select("id")
      .eq("tenant_id", tenant.id)
      .eq("slug", slug)
      .maybeSingle();
    if (!existing) break;
    slug = `${base}-${suffix}`;
  }

  const { data, error } = await supabase
    .from("properties")
    .insert({ tenant_id: tenant.id, title, slug, status: "draft" })
    .select("id")
    .single();

  if (error) return { error: error.message };

  redirect(`/admin/listings/${data.id}`);
}
