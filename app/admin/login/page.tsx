import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: adminRow } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (adminRow) redirect("/admin");
  }

  return (
    <main className="bg-surface-subtle flex min-h-dvh items-center justify-center p-6">
      <div className="bg-background shadow-card w-full max-w-sm rounded-lg p-8">
        <h1 className="text-xl font-semibold">Admin sign in</h1>
        <p className="text-text-muted mt-1 text-sm">
          Manage listings, bookings and enquiries.
        </p>
        <div className="mt-6">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
