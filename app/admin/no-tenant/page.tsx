import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/admin/(dashboard)/actions";

export const metadata: Metadata = {
  title: "Account not linked",
  robots: { index: false, follow: false },
};

/**
 * Where requireTenant() sends a signed-in, non-superadmin admin with no
 * tenant_members row — most likely because their tenant was hard-deleted
 * (phase C5). That cleanup deletes the login entirely for anyone left with
 * no tenant, so reaching this page at all should be rare; it exists so the
 * rare case is a legible page instead of an unhandled throw.
 */
export default async function NoTenantPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Reachable directly, not only via requireTenant()'s redirect — without
  // this, a signed-out visitor would see "account not linked" instead of
  // the true reason (they're not signed in at all), matching /admin/billing
  // and every other page in this group.
  if (!user) redirect("/admin/login");

  return (
    <main className="bg-surface-subtle flex min-h-dvh items-center justify-center p-6">
      <div className="bg-background shadow-card w-full max-w-sm rounded-lg p-8 text-center">
        <h1 className="text-xl font-semibold">Account not linked</h1>
        <p className="text-text-muted mt-2 text-sm">
          This account isn&apos;t linked to a business on the platform. If
          this is unexpected, contact the platform admin.
        </p>
        <p className="text-text-muted mt-6 text-xs">Signed in as {user.email}.</p>
        <form action={signOut} className="mt-4">
          <button
            type="submit"
            className="border-border hover:bg-surface-subtle pressable flex h-11 w-full items-center justify-center rounded-md border font-medium"
          >
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
