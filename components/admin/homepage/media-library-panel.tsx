"use client";

import { useState } from "react";
import Image from "next/image";
import { Loader2, Trash2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMediaLibrary } from "@/components/admin/homepage/media-library-context";
import { UploadPanel } from "@/components/admin/homepage/upload-panel";
import { homepageImageUrl } from "@/lib/images";
import { isVideoPath } from "@/lib/media";
import type { HomepageImage } from "@/lib/types/database";

function LibraryCard({ image }: { image: HomepageImage }) {
  const { updateMeta, remove } = useMediaLibrary();
  const [title, setTitle] = useState(image.title ?? "");
  const [alt, setAlt] = useState(image.alt ?? "");
  const [savePending, setSavePending] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const dirty = title !== (image.title ?? "") || alt !== (image.alt ?? "");
  const src = homepageImageUrl(image.storage_path);

  async function save() {
    setSavePending(true);
    setSaveError(null);
    const result = await updateMeta(image.id, title, alt);
    setSavePending(false);
    if (result.error) {
      setSaveError(result.error);
      return;
    }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  }

  async function del() {
    setDeletePending(true);
    setDeleteError(null);
    const result = await remove(image);
    setDeletePending(false);
    if (result.error) {
      setDeleteError(result.error);
      setConfirming(false);
    }
  }

  return (
    <div className="border-border overflow-hidden rounded-lg border">
      <div className="bg-surface-subtle relative aspect-[4/3]">
        {src ? (
          isVideoPath(src) ? (
            <video
              src={src}
              muted
              playsInline
              controls
              preload="metadata"
              className="absolute inset-0 size-full object-cover"
            />
          ) : (
            <Image src={src} alt="" fill sizes="240px" className="object-cover" />
          )
        ) : null}
        {isVideoPath(src) ? (
          <span className="pointer-events-none absolute right-2 bottom-2 rounded-full bg-[rgba(10,10,10,0.6)] px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
            Video
          </span>
        ) : null}
        {image.is_placeholder ? (
          <span className="bg-warning/95 text-warning-foreground absolute top-2 left-2 rounded-full px-2 py-0.5 text-[11px] font-medium">
            Sample photo
          </span>
        ) : null}
      </div>

      <div className="space-y-2 p-3">
        <div className="space-y-1">
          <Label htmlFor={`title-${image.id}`} className="text-xs">
            Title / caption
          </Label>
          <Input
            id={`title-${image.id}`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`alt-${image.id}`} className="text-xs">
            Alt text
          </Label>
          <Input
            id={`alt-${image.id}`}
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            className="h-8 text-sm"
          />
        </div>

        {saveError ? (
          <p role="alert" className="text-danger text-xs">
            {saveError}
          </p>
        ) : null}
        {deleteError ? (
          <p role="alert" className="text-danger text-xs">
            {deleteError}
          </p>
        ) : null}

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={save}
            disabled={!dirty || savePending}
            className="border-border hover:bg-surface-subtle pressable flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium disabled:opacity-40"
          >
            {savePending ? <Loader2 className="size-3 animate-spin" aria-hidden="true" /> : null}
            {saved ? "Saved" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={deletePending}
            aria-label="Delete photo"
            className="text-danger hover:bg-danger/10 pressable ml-auto flex size-8 items-center justify-center rounded-md"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </div>

        {confirming ? (
          <div className="border-danger/30 bg-danger/5 -mx-3 -mb-3 mt-2 space-y-2 rounded-b-lg border-t p-3">
            <p className="text-xs font-medium">Delete this photo?</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={del}
                disabled={deletePending}
                className="bg-danger pressable flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-white"
              >
                {deletePending ? <Loader2 className="size-3 animate-spin" aria-hidden="true" /> : null}
                Delete
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="border-border hover:bg-surface pressable flex h-8 items-center rounded-md border px-2.5 text-xs font-medium"
              >
                Keep it
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The full media library — every photo across every homepage section, in one
 * grid, with its title/alt editable and a delete that refuses (and says why)
 * when a section still points at it.
 */
export function MediaLibraryPanel() {
  const { pool } = useMediaLibrary();

  return (
    <div className="space-y-4">
      <p className="text-text-muted text-sm">
        Every photo you&apos;ve added to the homepage, in one place. Deleting one
        here removes it everywhere it&apos;s used is checked first — you&apos;ll be
        told which sections still reference it if any do.
      </p>

      <UploadPanel onUploaded={() => {}} />

      {pool.length ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {pool.map((image) => (
            <LibraryCard key={image.id} image={image} />
          ))}
        </div>
      ) : (
        <p className="text-text-muted text-sm">No photos uploaded yet.</p>
      )}
    </div>
  );
}
