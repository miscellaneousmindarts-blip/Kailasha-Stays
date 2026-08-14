"use client";

import { useState } from "react";
import { ExternalLink, Loader2, Trash2 } from "lucide-react";

import { useSaveAction } from "@/components/admin/use-save-action";
import { DuplicateListing } from "@/components/admin/duplicate-listing";
import {
  deleteProperty,
  setPropertyStatus,
} from "@/app/admin/(dashboard)/listings/[id]/actions";
import type { PropertyStatus } from "@/lib/types/database";

const STATUS_STYLES: Record<PropertyStatus, string> = {
  published: "bg-success/15 text-success",
  draft: "bg-warning/15 text-warning",
  archived: "bg-muted text-text-muted",
};

export function StatusControls({
  propertyId,
  liveUrl,
  title,
  status,
}: {
  propertyId: string;
  /**
   * The full absolute URL this property is actually reachable at — computed
   * by the caller (app/admin/(dashboard)/listings/[id]/page.tsx), which
   * knows the tenant's plan: a 'branded' tenant's own site
   * (siteUrl/properties/{slug}), or a 'listing' tenant's apex page
   * (deogharbnb.space/stays/{public_slug}) — the only place their property
   * exists (0027, docs/tenant-plans-plan.md). Passed pre-built rather than
   * assembled here so this component doesn't have to know which plan it's
   * looking at.
   */
  liveUrl: string;
  title: string;
  status: PropertyStatus;
}) {
  const statusAction = useSaveAction(setPropertyStatus);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    const result = await deleteProperty(propertyId);
    // deleteProperty redirects on success, so reaching here means it failed
    if (result?.error) {
      setDeleteError(result.error);
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${STATUS_STYLES[status]}`}
      >
        {status}
      </span>

      {status === "published" ? (
        <a
          href={liveUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="border-border hover:bg-surface-subtle pressable flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium"
        >
          View live
          <ExternalLink className="size-3.5" aria-hidden="true" />
        </a>
      ) : null}

      {status !== "published" ? (
        <button
          type="button"
          onClick={() => statusAction.run(propertyId, "published")}
          disabled={statusAction.pending}
          className="bg-primary text-primary-foreground hover:bg-primary-hover pressable flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium disabled:opacity-60"
        >
          {statusAction.pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : null}
          Publish
        </button>
      ) : (
        <button
          type="button"
          onClick={() => statusAction.run(propertyId, "draft")}
          disabled={statusAction.pending}
          className="border-border hover:bg-surface-subtle pressable flex h-9 items-center rounded-md border px-3 text-sm font-medium disabled:opacity-60"
        >
          Unpublish
        </button>
      )}

      {status !== "archived" ? (
        <button
          type="button"
          onClick={() => statusAction.run(propertyId, "archived")}
          disabled={statusAction.pending}
          className="border-border hover:bg-surface-subtle pressable flex h-9 items-center rounded-md border px-3 text-sm font-medium disabled:opacity-60"
        >
          Archive
        </button>
      ) : null}

      <DuplicateListing propertyId={propertyId} title={title} />

      {statusAction.error ? (
        <span role="alert" className="text-danger text-sm">
          {statusAction.error}
        </span>
      ) : null}

      <div className="ml-auto">
        {confirmingDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-sm">Delete this listing permanently?</span>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="bg-danger pressable flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-white disabled:opacity-60"
            >
              {deleting ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : null}
              Yes, delete
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="hover:bg-surface-subtle pressable flex h-9 items-center rounded-md px-3 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="text-danger hover:bg-danger/10 pressable flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium"
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
            Delete
          </button>
        )}
      </div>
      {deleteError ? (
        <p role="alert" className="text-danger w-full text-sm">
          {deleteError}
        </p>
      ) : null}
    </div>
  );
}
