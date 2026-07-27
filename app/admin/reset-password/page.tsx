import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Only reachable with the session the recovery link created.
  if (!user) redirect("/admin/forgot-password?expired=1");

  return (
    <main className="bg-surface-subtle flex min-h-dvh items-center justify-center p-6">
      <div className="bg-background shadow-card w-full max-w-sm rounded-lg p-8">
        <h1 className="text-xl font-semibold">Choose a new password</h1>
        <p className="text-text-muted mt-1 text-sm">
          Signed in as {user.email}.
        </p>
        <div className="mt-6">
          <ResetPasswordForm />
        </div>
      </div>
    </main>
  );
}
