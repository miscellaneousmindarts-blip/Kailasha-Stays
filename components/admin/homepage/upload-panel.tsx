"use client";

import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMediaLibrary } from "@/components/admin/homepage/media-library-context";
import type { HomepageImage } from "@/lib/types/database";

/**
 * Pick a file, type its title and alt text, upload. This is the one upload
 * path for every homepage photo — hero background, host portrait, map
 * landmarks, the "nothing hidden" grid, review photos, custom-section images
 * — all draw from the same library uploaded here.
 *
 * Title and alt are asked for up front rather than left for later: an
 * untitled photo dropped into the "nothing hidden" grid renders with no
 * caption, and a photo with no alt text is invisible to a screen reader, so
 * asking at the moment of upload means neither is forgotten.
 */
export function UploadPanel({
  onUploaded,
  onCancel,
}: {
  onUploaded: (image: HomepageImage) => void;
  onCancel?: () => void;
}) {
  const { upload } = useMediaLibrary();
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
    // Reset to the empty state rather than leaving the just-uploaded file's
    // preview sitting there — without this the form looks like an unsaved
    // draft even though the photo already landed in the library below.
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
          accept="image/jpeg,image/png,image/webp,image/avif"
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
        {/* Plain <img>: a local blob: preview, never something next/image can optimise. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={preview ?? undefined}
          alt=""
          className="bg-surface-subtle size-20 shrink-0 rounded-md object-cover"
        />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="space-y-1">
            <Label htmlFor="upload-title" className="text-xs">
              Photo title (shown as a caption where the section uses one)
            </Label>
            <Input
              id="upload-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="The bathroom, lights on"
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="upload-alt" className="text-xs">
              Alt text (for screen readers — not shown visually)
            </Label>
            <Input
              id="upload-alt"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="Clean tiled bathroom with Western toilet"
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
