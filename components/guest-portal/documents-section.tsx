"use client";

import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Check,
  Eye,
  FileCheck2,
  Loader2,
  Pencil,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/format";
import type { GuestBookingBundle } from "@/lib/types/guest-portal";

type Doc = { id: string; guest_name: string | null; doc_type: string; uploaded_at: string };

const EDIT_WINDOW_MS = 30 * 60 * 1000;

/** Within the 30-minute edit window a document's own uploaded_at grants. */
function isEditable(doc: Doc, now: number): boolean {
  return now - new Date(doc.uploaded_at).getTime() < EDIT_WINDOW_MS;
}

async function callApi(body: Record<string, unknown>, method: "PATCH" | "DELETE") {
  const res = await fetch("/api/guest-upload", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "That didn't work. Please try again.");
  return data;
}

function DocumentRow({
  token,
  doc,
  now,
  onRenamed,
  onRemoved,
}: {
  token: string;
  doc: Doc;
  now: number;
  onRenamed: (id: string, name: string | null) => void;
  onRemoved: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(doc.guest_name ?? "");
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [busy, setBusy] = useState<"view" | "save" | "remove" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const editable = isEditable(doc, now);

  async function handleView() {
    setBusy("view");
    setError(null);
    try {
      const res = await fetch(
        `/api/guest-upload?token=${encodeURIComponent(token)}&id=${encodeURIComponent(doc.id)}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not open that document.");
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open that document.");
    } finally {
      setBusy(null);
    }
  }

  async function handleSaveName() {
    setBusy("save");
    setError(null);
    try {
      await callApi({ token, id: doc.id, guest_name: nameDraft.trim() }, "PATCH");
      onRenamed(doc.id, nameDraft.trim() || null);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that change.");
    } finally {
      setBusy(null);
    }
  }

  async function handleRemove() {
    setBusy("remove");
    setError(null);
    try {
      await callApi({ token, id: doc.id }, "DELETE");
      onRemoved(doc.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove that document.");
      setBusy(null);
    }
  }

  return (
    <li className="p-3 text-sm">
      <div className="flex items-center gap-3">
        <FileCheck2 className="text-success size-4 shrink-0" aria-hidden="true" />

        {editing ? (
          <input
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            placeholder="Guest name (optional)"
            autoFocus
            className="border-border h-8 min-w-0 flex-1 rounded-md border px-2 text-sm"
          />
        ) : (
          <span className="min-w-0 truncate font-medium">{doc.guest_name ?? "Guest"}</span>
        )}

        <span className="text-text-muted ml-auto shrink-0 text-xs">
          {formatDate(doc.uploaded_at)}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {editing ? (
          <>
            <button
              type="button"
              onClick={handleSaveName}
              disabled={busy !== null}
              className="text-primary hover:bg-primary-tint pressable flex h-8 items-center gap-1 rounded-md px-2.5 text-xs font-medium disabled:opacity-60"
            >
              {busy === "save" ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Check className="size-3.5" aria-hidden="true" />
              )}
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setNameDraft(doc.guest_name ?? "");
              }}
              disabled={busy !== null}
              className="text-text-muted hover:bg-surface-subtle pressable flex h-8 items-center gap-1 rounded-md px-2.5 text-xs font-medium"
            >
              <X className="size-3.5" aria-hidden="true" />
              Cancel
            </button>
          </>
        ) : confirmingRemove ? (
          <>
            <span className="text-text-muted text-xs">Remove this document?</span>
            <button
              type="button"
              onClick={handleRemove}
              disabled={busy !== null}
              className="text-danger hover:bg-danger/10 pressable flex h-8 items-center gap-1 rounded-md px-2.5 text-xs font-medium disabled:opacity-60"
            >
              {busy === "remove" ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              ) : null}
              Yes, remove
            </button>
            <button
              type="button"
              onClick={() => setConfirmingRemove(false)}
              disabled={busy !== null}
              className="text-text-muted hover:bg-surface-subtle pressable flex h-8 items-center rounded-md px-2.5 text-xs font-medium"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={handleView}
              disabled={busy !== null}
              className="text-text-muted hover:bg-surface-subtle pressable flex h-8 items-center gap-1 rounded-md px-2.5 text-xs font-medium disabled:opacity-60"
            >
              {busy === "view" ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Eye className="size-3.5" aria-hidden="true" />
              )}
              View
            </button>
            {editable ? (
              <>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="text-text-muted hover:bg-surface-subtle pressable flex h-8 items-center gap-1 rounded-md px-2.5 text-xs font-medium"
                >
                  <Pencil className="size-3.5" aria-hidden="true" />
                  Edit name
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingRemove(true)}
                  className="text-danger hover:bg-danger/10 pressable flex h-8 items-center gap-1 rounded-md px-2.5 text-xs font-medium"
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                  Remove
                </button>
              </>
            ) : null}
          </>
        )}
      </div>

      {!editable && !editing ? (
        <p className="text-text-muted mt-1 text-xs">
          Uploaded more than 30 minutes ago — contact us if this needs to change.
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="text-danger mt-1 text-xs">
          {error}
        </p>
      ) : null}
    </li>
  );
}

export function DocumentsSection({
  token,
  bundle,
}: {
  token: string;
  bundle: GuestBookingBundle;
}) {
  const [documents, setDocuments] = useState<Doc[]>(bundle.documents);
  const [guestName, setGuestName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const inputRef = useRef<HTMLInputElement>(null);

  const expected = bundle.booking.guests ?? 0;

  // Ticks the clock so a document's edit window visibly closes without
  // needing a page reload — the server is the real enforcement, this is
  // just so the buttons don't linger past the point they'd start failing.
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.set("token", token);
    formData.set("guest_name", guestName.trim());
    formData.set("file", file);

    try {
      const res = await fetch("/api/guest-upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed.");
      setDocuments((prev) => [
        ...prev,
        {
          id: data.document.id,
          guest_name: data.document.guest_name,
          doc_type: "govt_id",
          uploaded_at: data.document.uploaded_at,
        },
      ]);
      setGuestName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <section className="border-border border-t py-6">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
        <ShieldAlert className="text-primary size-5" aria-hidden="true" />
        Guest details
      </h2>

      <div className="bg-primary-tint text-primary rounded-md p-3 text-sm">
        Please upload a government ID for each guest — required by local
        regulations.
        {expected > 0 ? (
          <span className="tabular ml-1 font-medium">
            {documents.length} of {expected} uploaded
          </span>
        ) : null}
      </div>

      {documents.length ? (
        <ul className="border-border divide-border mt-3 divide-y rounded-md border">
          {documents.map((d) => (
            <DocumentRow
              key={d.id}
              token={token}
              doc={d}
              now={now}
              onRenamed={(id, name) =>
                setDocuments((prev) =>
                  prev.map((doc) => (doc.id === id ? { ...doc, guest_name: name } : doc)),
                )
              }
              onRemoved={(id) =>
                setDocuments((prev) => prev.filter((doc) => doc.id !== id))
              }
            />
          ))}
        </ul>
      ) : null}

      <div className="mt-4 space-y-3">
        <div className="space-y-1">
          <Label htmlFor="doc-guest-name">Guest&apos;s name (optional)</Label>
          <Input
            id="doc-guest-name"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="As on the ID"
            className="h-11"
          />
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          capture="environment"
          className="sr-only"
          id="doc-upload"
          onChange={(e) => handleFile(e.currentTarget.files?.[0])}
        />
        <label
          htmlFor="doc-upload"
          className="hover:bg-surface-subtle pressable flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed font-medium"
        >
          {uploading ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Uploading…
            </>
          ) : (
            <>
              <Camera className="size-4" aria-hidden="true" />
              Photograph or upload ID
            </>
          )}
        </label>
        {error ? (
          <p role="alert" className="text-danger text-sm">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}
