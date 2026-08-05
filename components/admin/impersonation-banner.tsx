"use client";

import { useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";

import { stopImpersonation } from "@/app/superadmin/actions";

/**
 * Shown on every admin page while a superadmin is acting as a customer.
 *
 * Deliberately not dismissible and deliberately loud: the failure mode this
 * prevents is someone forgetting whose account they're in and editing a real
 * customer's live site by accident. A banner you can close is a banner that
 * gets closed.
 */
export function ImpersonationBanner({ tenantName }: { tenantName: string }) {
  const [pending, setPending] = useState(false);

  return (
    <div className="bg-warning text-warning-foreground sticky top-0 z-50">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 text-sm">
        <p className="flex items-center gap-2 font-medium">
          <ShieldAlert className="size-4 shrink-0" aria-hidden="true" />
          You are managing <strong>{tenantName}</strong> — changes affect their live site.
        </p>
        <form
          action={async () => {
            setPending(true);
            await stopImpersonation();
          }}
        >
          <button
            type="submit"
            disabled={pending}
            className="pressable flex h-8 items-center gap-1.5 rounded-md bg-[rgba(0,0,0,0.18)] px-3 font-medium hover:bg-[rgba(0,0,0,0.28)] disabled:opacity-60"
          >
            {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : null}
            Exit
          </button>
        </form>
      </div>
    </div>
  );
}
