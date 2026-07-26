"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slug";

export type CreateListingState = { error: string } | undefined;

export async function createListing(
  _prevState: CreateListingState,
  formData: FormData,
): Promise<CreateListingState> {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Enter a title for the property." };

  const supabase = await createClient();
  const base = slugify(title) || "property";

  let slug = base;
  for (let suffix = 2; suffix <= 20; suffix++) {
    const { data: existing } = await supabase
      .from("properties")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!existing) break;
    slug = `${base}-${suffix}`;
  }

  const { data, error } = await supabase
    .from("properties")
    .insert({ title, slug, status: "draft" })
    .select("id")
    .single();

  if (error) return { error: error.message };

  redirect(`/admin/listings/${data.id}`);
}
