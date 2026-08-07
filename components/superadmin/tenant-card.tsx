"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Archive,
  ExternalLink,
  Loader2,
  Mail,
  MoreVertical,
  Pencil,
  Trash2,
  Zap,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { useSaveAction } from "@/components/admin/use-save-action";
import {
  deleteTenantForever,
  inviteOwner,
  setTenantStatus,
  startImpersonation,
} from "@/app/superadmin/actions";
import { EditTenantModal } from "@/components/superadmin/edit-tenant-modal";
import type { TenantRow } from "@/lib/superadmin/types";
import { tenantSiteUrl } from "@/lib/tenant";
import type { TenantStatus } from "@/lib/types/database";

const STATUS_STYLES: Record<TenantStatus, string> = {
  invited: "bg-muted text-text-muted",
  awaiting_payment: "bg-warning/15 text-warning",
  active: "bg-success/15 text-success",
  suspended: "bg-danger/15 text-danger",
  cancelled: "bg-muted text-text-muted",
};

/** Statuses one tap away from active — the single most common superadmin action. */
const ACTIVATABLE: TenantStatus[] = ["invited", "awaiting_payment", "suspended"];

type SheetView = "menu" | "archive" | "delete";

function ActionsSheet({
  tenant,
  onClose,
  onEdit,
}: {
  tenant: TenantRow;
  onClose: () => void;
  onEdit: () => void;
}) {
  const [view, setView] = useState<SheetView>("menu");
  const archiveAction = useSaveAction(setTenantStatus);
  const deleteAction = useSaveAction(deleteTenantForever);
  const [confirmName, setConfirmName] = useState("");

  if (view === "archive") {
    return (
      <ResponsiveModal open onClose={onClose} title="Archive this business?">
        <div className="space-y-4">
          <p className="text-sm">
            <strong>{tenant.name}</strong>&apos;s public site goes offline
            immediately and the owner loses panel access. Nothing is deleted —
            this is fully reversible from Edit details.
          </p>
          {archiveAction.error ? (
            <p role="alert" className="text-danger text-sm">
              {archiveAction.error}
            </p>
          ) : null}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={async () => {
                const ok = await archiveAction.runAndWait(tenant.id, "cancelled");
                if (ok) onClose();
              }}
              disabled={archiveAction.pending}
              className="bg-danger pressable flex h-11 flex-1 items-center justify-center gap-2 rounded-md font-medium text-white disabled:opacity-60"
            >
              {archiveAction.pending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : null}
              Yes, archive
            </button>
            <button
              type="button"
              onClick={() => setView("menu")}
              disabled={archiveAction.pending}
              className="border-border hover:bg-surface-subtle pressable flex h-11 flex-1 items-center justify-center rounded-md border font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </ResponsiveModal>
    );
  }

  if (view === "delete") {
    const matches = confirmName.trim() === tenant.name;
    return (
      <ResponsiveModal open onClose={onClose} title="Delete forever">
        <div className="space-y-4">
          <div className="bg-danger/10 text-danger flex items-start gap-2 rounded-md p-3 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p>
              This permanently destroys <strong>{tenant.name}</strong>&apos;s
              listings, bookings, payment records and every uploaded guest ID.
              It cannot be undone.
            </p>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="confirm_name" className="text-sm font-medium">
              Type <strong>{tenant.name}</strong> to confirm
            </label>
            <Input
              id="confirm_name"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              autoComplete="off"
              className="h-11"
            />
          </div>
          {deleteAction.error ? (
            <p role="alert" className="text-danger text-sm">
              {deleteAction.error}
            </p>
          ) : null}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={async () => {
                const ok = await deleteAction.runAndWait(tenant.id, confirmName);
                if (ok) onClose();
              }}
              disabled={!matches || deleteAction.pending}
              className="bg-danger pressable flex h-11 flex-1 items-center justify-center gap-2 rounded-md font-medium text-white disabled:opacity-40"
            >
              {deleteAction.pending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : null}
              Delete forever
            </button>
            <button
              type="button"
              onClick={() => setView("menu")}
              disabled={deleteAction.pending}
              className="border-border hover:bg-surface-subtle pressable flex h-11 flex-1 items-center justify-center rounded-md border font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </ResponsiveModal>
    );
  }

  return (
    <ResponsiveModal open onClose={onClose} title={tenant.name}>
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={onEdit}
          className="hover:bg-surface-subtle pressable flex h-12 items-center gap-3 rounded-md px-3 text-left font-medium"
        >
          <Pencil className="text-text-muted size-4" aria-hidden="true" />
          Edit details
        </button>
        {tenant.status !== "cancelled" ? (
          <button
            type="button"
            onClick={() => setView("archive")}
            className="hover:bg-surface-subtle pressable flex h-12 items-center gap-3 rounded-md px-3 text-left font-medium"
          >
            <Archive className="text-text-muted size-4" aria-hidden="true" />
            Archive
          </button>
        ) : null}
        <div className="border-border my-1 border-t" />
        <button
          type="button"
          onClick={() => setView("delete")}
          className="text-danger hover:bg-danger/10 pressable flex h-12 items-center gap-3 rounded-md px-3 text-left font-medium"
        >
          <Trash2 className="size-4" aria-hidden="true" />
          Delete forever
        </button>
      </div>
    </ResponsiveModal>
  );
}

export function TenantCard({ tenant }: { tenant: TenantRow }) {
  const activateAction = useSaveAction(setTenantStatus);
  const inviteAction = useSaveAction(inviteOwner);
  const [invitingOwner, setInvitingOwner] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
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

  // Absolute, not a base path: once a tenant is on its own host, a relative
  // link from the console would point at the console's host instead of theirs.
  const publicHref = tenantSiteUrl(tenant) || "/";

  return (
    <li className="border-border rounded-lg border p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-medium">{tenant.name}</p>
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

        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-label={`More actions for ${tenant.name}`}
          className="hover:bg-surface-subtle pressable -mr-1.5 flex size-11 shrink-0 items-center justify-center rounded-full"
        >
          <MoreVertical className="size-5" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
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

        {ACTIVATABLE.includes(tenant.status) ? (
          <button
            type="button"
            onClick={() => activateAction.run(tenant.id, "active")}
            disabled={activateAction.pending}
            className="bg-success/15 text-success pressable flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium disabled:opacity-60"
          >
            {activateAction.pending ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Zap className="size-3.5" aria-hidden="true" />
            )}
            Activate
          </button>
        ) : null}

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
            Manage as
          </button>
        )}
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

      {activateAction.error || impersonateError || inviteAction.error ? (
        <p role="alert" className="text-danger mt-2 text-sm">
          {activateAction.error || impersonateError || inviteAction.error}
        </p>
      ) : null}

      {sheetOpen ? (
        <ActionsSheet
          tenant={tenant}
          onClose={() => setSheetOpen(false)}
          onEdit={() => {
            setSheetOpen(false);
            setEditOpen(true);
          }}
        />
      ) : null}

      {editOpen ? <EditTenantModal tenant={tenant} onClose={() => setEditOpen(false)} /> : null}
    </li>
  );
}
