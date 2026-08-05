import type { Metadata } from "next";

import { requireTenant } from "@/lib/admin/auth";
import { signOut } from "@/app/admin/(dashboard)/actions";
import type { TenantStatus } from "@/lib/types/database";

export const metadata: Metadata = {
  title: "Billing",
  robots: { index: false, follow: false },
};

const COPY: Record<TenantStatus, { heading: string; body: string }> = {
  invited: {
    heading: "Welcome — you're almost set up",
    body: "Your account is created. Reach out to us to arrange payment and we'll activate your site.",
  },
  awaiting_payment: {
    heading: "Waiting on payment",
    body: "We haven't confirmed your payment yet. Once it's received we'll activate your account and your dashboard opens up.",
  },
  active: {
    heading: "You're all set",
    body: "Your account is active.",
  },
  suspended: {
    heading: "Account suspended",
    body: "Your account is currently suspended and your public site is offline. Contact us to resolve this.",
  },
  cancelled: {
    heading: "Account cancelled",
    body: "This account has been cancelled. Contact us if you'd like to reactivate it.",
  },
};

export default async function BillingPage() {
  const { user, tenant } = await requireTenant();
  const copy = COPY[tenant.status];

  return (
    <main className="bg-surface-subtle flex min-h-dvh items-center justify-center p-6">
      <div className="bg-background shadow-card w-full max-w-sm rounded-lg p-8 text-center">
        <p className="text-text-muted text-sm">{tenant.name}</p>
        <h1 className="mt-1 text-xl font-semibold">{copy.heading}</h1>
        <p className="text-text-muted mt-2 text-sm">{copy.body}</p>
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
