"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import {
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Loader2,
  Star,
  Trash2,
} from "lucide-react";

import { useSaveAction } from "@/components/admin/use-save-action";
import {
  deletePropertyImage,
  moveImage,
  setCoverImage,
  updateImageAlt,
  uploadPropertyImage,
} from "@/app/admin/(dashboard)/listings/[id]/actions";
import { imageUrl } from "@/lib/images";
import type { PropertyImage } from "@/lib/types/database";

function PhotoCard({
  propertyId,
  image,
  isFirst,
  isLast,
}: {
  propertyId: string;
  image: PropertyImage;
  isFirst: boolean;
  isLast: boolean;
}) {
  const del = useSaveAction(deletePropertyImage);
  const cover = useSaveAction(setCoverImage);
  const move = useSaveAction(moveImage);
  const alt = useSaveAction(updateImageAlt);
  const src = imageUrl(image.storage_path);

  return (
    <div className="border-border overflow-hidden rounded-lg border">
      <div className="bg-surface-subtle relative aspect-[4/3]">
        {src ? <Image src={src} alt={image.alt ?? ""} fill sizes="240px" className="object-cover" /> : null}
        {image.is_cover ? (
          <span className="bg-primary text-primary-foreground absolute top-2 left-2 flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium">
            <Star className="size-3" aria-hidden="true" />
            Cover
          </span>
        ) : null}
      </div>
      <div className="space-y-2 p-3">
        <input
          type="text"
          defaultValue={image.alt ?? ""}
          placeholder="Alt text (for accessibility)"
          onBlur={(e) => alt.run(propertyId, image.id, e.currentTarget.value)}
          className="border-border h-9 w-full rounded-md border bg-transparent px-2 text-sm"
        />
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => move.run(propertyId, image.id, "up")}
              disabled={isFirst || move.pending}
              aria-label="Move earlier"
              className="hover:bg-surface-subtle pressable flex size-9 items-center justify-center rounded-full disabled:opacity-30"
            >
              <ChevronUp className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => move.run(propertyId, image.id, "down")}
              disabled={isLast || move.pending}
              aria-label="Move later"
              className="hover:bg-surface-subtle pressable flex size-9 items-center justify-center rounded-full disabled:opacity-30"
            >
              <ChevronDown className="size-4" aria-hidden="true" />
            </button>
          </div>
          <div className="flex items-center gap-1">
            {!image.is_cover ? (
              <button
                type="button"
                onClick={() => cover.run(propertyId, image.id)}
                disabled={cover.pending}
                className="hover:bg-surface-subtle pressable flex h-9 items-center rounded-md px-2 text-xs font-medium"
              >
                Make cover
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => del.run(propertyId, image.id, image.storage_path)}
              disabled={del.pending}
              aria-label="Delete photo"
              className="text-danger hover:bg-danger/10 pressable flex size-9 items-center justify-center rounded-full"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
        {del.error || cover.error || move.error || alt.error ? (
          <p role="alert" className="text-danger text-xs">
            {del.error || cover.error || move.error || alt.error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function PhotosTab({
  propertyId,
  images,
}: {
  propertyId: string;
  images: PropertyImage[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError(null);
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.set("file", file);
      const result = await uploadPropertyImage(propertyId, formData);
      if (result?.error) {
        setUploadError(result.error);
        break;
      }
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="max-w-3xl space-y-4">
      <p className="text-text-muted text-sm">
        The first photo (or the one marked Cover) is used on the properties
        grid and in search previews.
      </p>

      {images.length ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {images.map((img, i) => (
            <PhotoCard
              key={img.id}
              propertyId={propertyId}
              image={img}
              isFirst={i === 0}
              isLast={i === images.length - 1}
            />
          ))}
        </div>
      ) : null}

      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          className="sr-only"
          id="photo-upload"
          onChange={(e) => handleFiles(e.currentTarget.files)}
        />
        <label
          htmlFor="photo-upload"
          className="hover:bg-surface-subtle pressable flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed font-medium"
        >
          {uploading ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Uploading…
            </>
          ) : (
            <>
              <ImagePlus className="size-4" aria-hidden="true" />
              Upload photos
            </>
          )}
        </label>
        {uploadError ? (
          <p role="alert" className="text-danger mt-2 text-sm">
            {uploadError}
          </p>
        ) : null}
      </div>
    </div>
  );
}
