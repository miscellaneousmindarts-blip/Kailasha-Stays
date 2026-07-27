"use client";

import { useRef, useState } from "react";
import { Camera, FileCheck2, Loader2, ShieldAlert } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/format";
import type { GuestBookingBundle } from "@/lib/types/guest-portal";

export function DocumentsSection({
  token,
  bundle,
}: {
  token: string;
  bundle: GuestBookingBundle;
}) {
  const [documents, setDocuments] = useState(bundle.documents);
  const [guestName, setGuestName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const expected = bundle.booking.guests ?? 0;

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!guestName.trim()) {
      setError("Enter the guest's name first.");
      return;
    }
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
        { guest_name: guestName.trim(), doc_type: "govt_id", uploaded_at: new Date().toISOString() },
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
          {documents.map((d, i) => (
            <li key={i} className="flex items-center gap-3 p-3 text-sm">
              <FileCheck2 className="text-success size-4 shrink-0" aria-hidden="true" />
              <span className="font-medium">{d.guest_name ?? "Guest"}</span>
              <span className="text-text-muted ml-auto">
                {formatDate(d.uploaded_at)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4 space-y-3">
        <div className="space-y-1">
          <Label htmlFor="doc-guest-name">Guest&apos;s name</Label>
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
          className={`hover:bg-surface-subtle pressable flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed font-medium ${
            !guestName.trim() ? "pointer-events-none opacity-50" : ""
          }`}
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
