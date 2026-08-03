"use client";

import { useState } from "react";
import { Copy, Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { duplicateProperty } from "@/app/admin/(dashboard)/listings/[id]/actions";

/**
 * Renders as two siblings of the surrounding flex-wrap action row: the button
 * sits inline with Publish / Archive, and the panel is `w-full` so it drops
 * onto its own line rather than squeezing the row.
 *
 * The title is asked for up front because it's the one thing a copy can't
 * inherit — two listings called the same thing are indistinguishable in the
 * admin list, and the slug is derived from it.
 */
export function DuplicateListing({
  propertyId,
  title,
}: {
  propertyId: string;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const [newTitle, setNewTitle] = useState(`Copy of ${title}`);
  const [withImages, setWithImages] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    // Redirects to the new listing on success, so getting a result back at
    // all means it failed.
    const result = await duplicateProperty(propertyId, newTitle, withImages);
    if (result?.error) {
      setError(result.error);
      setPending(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="border-border hover:bg-surface-subtle pressable flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium"
      >
        <Copy className="size-3.5" aria-hidden="true" />
        Duplicate
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-border bg-surface-subtle w-full space-y-4 rounded-md border p-4"
    >
      <div>
        <p className="font-medium">Duplicate this listing</p>
        <p className="text-text-muted mt-1 text-sm">
          Everything that describes the property is copied — details, price
          periods, add-ons, page sections, contacts and private info. Bookings,
          enquiries and calendar sync are not, so the copy starts with a clean
          calendar. It lands as a draft for you to edit before publishing.
        </p>
      </div>

      <div className="max-w-md space-y-1">
        <Label htmlFor="duplicate-title">Title for the new listing</Label>
        <Input
          id="duplicate-title"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          maxLength={160}
          required
          autoFocus
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "duplicate-error" : undefined}
          className="h-11"
        />
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={withImages}
            onChange={(e) => setWithImages(e.target.checked)}
            className="size-4"
          />
          Copy the photos too
        </label>
        <p className="text-text-muted mt-1 text-sm">
          {withImages
            ? "Each photo is copied to its own file, so deleting one from either listing leaves the other untouched."
            : "The copy starts with no photos. Photo-only sections are left out, and photos inside other sections are cleared for you to replace."}
        </p>
      </div>

      {error ? (
        <p id="duplicate-error" role="alert" className="text-danger text-sm">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={pending || !newTitle.trim()}
          className="bg-primary text-primary-foreground hover:bg-primary-hover pressable flex h-11 items-center gap-2 rounded-md px-4 text-sm font-medium disabled:opacity-60"
        >
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          {pending ? "Duplicating…" : "Duplicate listing"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          disabled={pending}
          className="border-border hover:bg-surface pressable flex h-11 items-center rounded-md border px-4 text-sm font-medium disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
