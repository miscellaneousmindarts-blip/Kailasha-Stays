import "server-only";

import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/**
 * The single place that decides whether the current request may see admin
 * pages. No session → straight to login. A session that isn't in
 * admin_users → notFound(), so the existence of /admin is never confirmed to
 * a random logged-in (non-admin) account.
 */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminRow) notFound();

  return { supabase, user };
}
