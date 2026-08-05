"use client";

import { useRef } from "react";
import { ExternalLink, FileText, Loader2, Trash2, Upload } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SaveBar } from "@/components/admin/save-bar";
import { useSaveAction } from "@/components/admin/use-save-action";
import {
  removeRoomServiceMenu,
  updateProperty,
  uploadRoomServiceMenu,
} from "@/app/admin/(dashboard)/listings/[id]/actions";
import { propertyDocumentUrl } from "@/lib/images";
import type { Property } from "@/lib/types/database";

export function RoomServiceTab({ property }: { property: Property }) {
  const linkAction = useSaveAction(updateProperty);
  const uploadAction = useSaveAction(uploadRoomServiceMenu);
  const removeAction = useSaveAction(removeRoomServiceMenu);
  const fileRef = useRef<HTMLInputElement>(null);
  const pdfUrl = propertyDocumentUrl(property.room_service_pdf_path);

  async function pick(file: File) {
    const formData = new FormData();
    formData.set("file", file);
    await uploadAction.runAndWait(property.id, formData);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="max-w-xl space-y-8">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          linkAction.run(property.id, new FormData(e.currentTarget));
        }}
        className="space-y-3"
      >
        <Label htmlFor="room_service_link">Menu link</Label>
        <Input
          id="room_service_link"
          name="room_service_link"
          type="url"
          placeholder="https://..."
          defaultValue={property.room_service_link ?? ""}
          className="h-11"
        />
        <p className="text-text-muted text-sm">
          A link to an ordering page or hosted menu. Shown alongside the PDF below — set
          either, both, or neither.
        </p>
        <SaveBar pending={linkAction.pending} saved={linkAction.saved} error={linkAction.error} />
      </form>

      <div className="border-border space-y-3 border-t pt-6">
        <p className="font-medium">Menu PDF</p>

        {pdfUrl ? (
          <div className="border-border flex items-center gap-3 rounded-md border p-3">
            <FileText className="text-text-muted size-5 shrink-0" aria-hidden="true" />
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-sm font-medium hover:underline"
            >
              View current PDF
              <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
            </a>
          </div>
        ) : (
          <p className="text-text-muted text-sm">No PDF uploaded yet.</p>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) pick(file);
          }}
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploadAction.pending || removeAction.pending}
            className="border-border hover:bg-surface-subtle pressable flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium disabled:opacity-60"
          >
            {uploadAction.pending ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Upload className="size-3.5" aria-hidden="true" />
            )}
            {property.room_service_pdf_path ? "Replace" : "Upload"}
          </button>
          {property.room_service_pdf_path ? (
            <button
              type="button"
              onClick={() => removeAction.run(property.id)}
              disabled={uploadAction.pending || removeAction.pending}
              className="text-danger hover:bg-danger/10 pressable flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium disabled:opacity-60"
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              Remove
            </button>
          ) : null}
        </div>
        <p className="text-text-muted text-sm">PDF only, up to 10MB.</p>
        {uploadAction.error || removeAction.error ? (
          <p role="alert" className="text-danger text-sm">
            {uploadAction.error || removeAction.error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
