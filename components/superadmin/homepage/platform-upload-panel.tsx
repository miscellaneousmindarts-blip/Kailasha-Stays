"use client";

import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePlatformMediaLibrary } from "@/components/superadmin/homepage/platform-media-library-context";
import { IMAGE_MIME_TYPES } from "@/lib/media";
import type { PlatformImage } from "@/lib/types/database";

const IMAGE_ACCEPT = IMAGE_MIME_TYPES.join(",");

/**
 * Same as components/admin/homepage/upload-panel.tsx, against the apex's own
 * library instead of a tenant's — see platform-media-library-context.tsx for
 * why this is a separate copy rather than a shared, parameterised component.
 * Images only (no MEDIA_ACCEPT/video branch) — see uploadPlatformImage()'s
 * comment for why.
 */
export function PlatformUploadPanel({
  onUploaded,
  onCancel,
}: {
  onUploaded: (image: PlatformImage) => void;
  onCancel?: () => void;
}) {
  const { upload } = usePlatformMediaLibrary();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [alt, setAlt] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pick(f: File) {
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError(null);
  }

  async function submit() {
    if (!file) return;
    setUploading(true);
    setError(null);
    const result = await upload(file, title, alt);
    setUploading(false);
    if (result.error || !result.image) {
      setError(result.error ?? "Upload failed.");
      return;
    }
    setFile(null);
    setPreview(null);
    setTitle("");
    setAlt("");
    onUploaded(result.image);
  }

  if (!file) {
    return (
      <div className="border-border rounded-md border border-dashed">
        <input
          ref={fileRef}
          type="file"
          accept={IMAGE_ACCEPT}
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) pick(f);
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="hover:bg-surface-subtle pressable flex h-24 w-full flex-col items-center justify-center gap-1.5 rounded-md text-sm font-medium"
        >
          <Upload className="text-text-muted size-5" aria-hidden="true" />
          Upload a photo
        </button>
      </div>
    );
  }

  return (
    <div className="border-border space-y-3 rounded-md border p-3">
      <div className="flex gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={preview ?? undefined}
          alt=""
          className="bg-surface-subtle size-20 shrink-0 rounded-md object-cover"
        />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="space-y-1">
            <Label htmlFor="platform-upload-title" className="text-xs">
              Photo title (shown as a caption where the section uses one)
            </Label>
            <Input
              id="platform-upload-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="The apex hero photo"
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="platform-upload-alt" className="text-xs">
              Alt text (for screen readers — not shown visually)
            </Label>
            <Input
              id="platform-upload-alt"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="A home near Baba Baidyanath Dham, Deoghar"
              className="h-9 text-sm"
            />
          </div>
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={uploading}
          className="bg-primary text-primary-foreground hover:bg-primary-hover pressable flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium disabled:opacity-60"
        >
          {uploading ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : null}
          Add to library
        </button>
        <button
          type="button"
          onClick={() => {
            setFile(null);
            setPreview(null);
            setError(null);
            onCancel?.();
          }}
          disabled={uploading}
          className="border-border hover:bg-surface-subtle pressable flex h-9 items-center rounded-md border px-3 text-sm font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
