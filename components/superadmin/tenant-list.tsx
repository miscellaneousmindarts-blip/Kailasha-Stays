"use client";

import { useState } from "react";
import { ExternalLink, Loader2, LogIn, Mail } from "lucide-react";

import { Input } from "@/components/ui/input";
import { useSaveAction } from "@/components/admin/use-save-action";
import { inviteOwner, setTenantStatus, startImpersonation } from "@/app/superadmin/actions";
import { TENANT_STATUSES, type TenantRow } from "@/lib/superadmin/types";
import { tenantBasePath } from "@/lib/tenant";
import type { TenantStatus } from "@/lib/types/database";

const STATUS_STYLES: Record<TenantStatus, string> = {
  invited: "bg-muted text-text-muted",
  awaiting_payment: "bg-warning/15 text-warning",
  active: "bg-success/15 text-success",
  suspended: "bg-danger/15 text-danger",
  cancelled: "bg-muted text-text-muted",
};

function TenantRowItem({ tenant }: { tenant: TenantRow }) {
  const statusAction = useSaveAction(setTenantStatus);
  const inviteAction = useSaveAction(inviteOwner);
  const [invitingOwner, setInvitingOwner] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState("");
  const [confirming, setConfirming] = useState(false);
  // startImpersonation redirects on success, so it's called directly rather
  // than through useSaveAction — same pattern as deleteProperty. Reaching the
  // line after the await at all means it failed.
  const [impersonating, setImpersonating] = useState(false);
  const [impersonateError, setImpersonateError] = useState<string | null>(null);

  async function beginImpersonation() {
    setImpersonating(true);
    setImpersonateError(null);
    const result = await startImpersonation(tenant.id);
    if (result?.error) {
      setImpersonateError(result.error);
      setImpersonating(false);
    }
  }

  const basePath = tenantBasePath(tenant.slug);
  const publicHref = basePath || "/";

  return (
    <li className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{tenant.name}</p>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[tenant.status]}`}
            >
              {tenant.status.replace("_", " ")}
            </span>
          </div>
          <p className="text-text-muted mt-1 truncate text-sm">
            /{tenant.slug} · {tenant.propertyCount}{" "}
            {tenant.propertyCount === 1 ? "listing" : "listings"} · {tenant.bookingCount}{" "}
            {tenant.bookingCount === 1 ? "booking" : "bookings"}
          </p>
          <p className="text-text-muted mt-0.5 truncate text-sm">
            {tenant.owners.length ? tenant.owners.join(", ") : "No owner account yet"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {tenant.status === "active" ? (
            <a
              href={publicHref}
              target="_blank"
              rel="noopener noreferrer"
              className="border-border hover:bg-surface-subtle pressable flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium"
            >
              View site
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          ) : null}

          <select
            value={tenant.status}
            onChange={(e) => statusAction.run(tenant.id, e.target.value as TenantStatus)}
            disabled={statusAction.pending}
            aria-label={`Status for ${tenant.name}`}
            className="border-border h-9 rounded-md border bg-transparent px-2 text-sm"
          >
            {TENANT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>

          {!tenant.owners.length && !invitingOwner ? (
            <button
              type="button"
              onClick={() => setInvitingOwner(true)}
              className="border-border hover:bg-surface-subtle pressable flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium"
            >
              <Mail className="size-3.5" aria-hidden="true" />
              Invite owner
            </button>
          ) : null}

          {confirming ? (
            <span className="flex items-center gap-2">
              <button
                type="button"
                onClick={beginImpersonation}
                disabled={impersonating}
                className="bg-primary text-primary-foreground hover:bg-primary-hover pressable flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium disabled:opacity-60"
              >
                {impersonating ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                ) : null}
                Yes, manage as them
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="hover:bg-surface-subtle pressable flex h-9 items-center rounded-md px-3 text-sm font-medium"
              >
                Cancel
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="border-border hover:bg-surface-subtle pressable flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium"
            >
              <LogIn className="size-3.5" aria-hidden="true" />
              Manage as
            </button>
          )}
        </div>
      </div>

      {confirming ? (
        <p className="text-text-muted mt-2 text-sm">
          You&apos;ll be editing {tenant.name}&apos;s real data — anything you change is
          their live site. The session is recorded.
        </p>
      ) : null}

      {invitingOwner ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await inviteAction.runAndWait(tenant.id, ownerEmail);
            if (ok) {
              setOwnerEmail("");
              setInvitingOwner(false);
            }
          }}
          className="mt-3 flex flex-wrap items-center gap-2"
        >
          <Input
            type="email"
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            required
            placeholder="owner@example.com"
            aria-label={`Owner email for ${tenant.name}`}
            className="h-9 max-w-xs"
          />
          <button
            type="submit"
            disabled={inviteAction.pending}
            className="bg-primary text-primary-foreground hover:bg-primary-hover pressable flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium disabled:opacity-60"
          >
            {inviteAction.pending ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            ) : null}
            Send invite
          </button>
          <button
            type="button"
            onClick={() => setInvitingOwner(false)}
            className="hover:bg-surface-subtle pressable flex h-9 items-center rounded-md px-3 text-sm font-medium"
          >
            Cancel
          </button>
        </form>
      ) : null}

      {statusAction.error || impersonateError || inviteAction.error ? (
        <p role="alert" className="text-danger mt-2 text-sm">
          {statusAction.error || impersonateError || inviteAction.error}
        </p>
      ) : null}
    </li>
  );
}

export function TenantList({ tenants }: { tenants: TenantRow[] }) {
  if (!tenants.length) {
    return (
      <div className="border-border rounded-lg border border-dashed p-10 text-center">
        <p className="font-medium">No tenants yet</p>
        <p className="text-text-muted mt-1 text-sm">Add the first one below.</p>
      </div>
    );
  }

  return (
    <ul className="border-border divide-border divide-y rounded-lg border">
      {tenants.map((t) => (
        <TenantRowItem key={t.id} tenant={t} />
      ))}
    </ul>
  );
}
