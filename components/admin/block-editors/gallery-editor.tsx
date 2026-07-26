"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, ImageOff } from "lucide-react";

import { SaveBar } from "@/components/admin/save-bar";
import { imageUrl } from "@/lib/images";
import type { BlockContent } from "@/lib/blocks";
import type { PropertyImage } from "@/lib/types/database";

export function GalleryEditor({
  content,
  onSave,
  pending,
  error,
  saved,
  propertyImages,
}: {
  content: BlockContent<"gallery">;
  onSave: (content: BlockContent<"gallery">) => void;
  pending: boolean;
  error: string | null;
  saved: boolean;
  propertyImages: PropertyImage[];
}) {
  const [selected, setSelected] = useState(
    new Set(content.images.map((i) => i.storage_path)),
  );

  function toggle(path: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  if (!propertyImages.length) {
    return (
      <p className="text-text-muted flex items-center gap-2 text-sm">
        <ImageOff className="size-4" aria-hidden="true" />
        Upload photos in the Photos tab first, then pick some here.
      </p>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const images = propertyImages
          .filter((img) => selected.has(img.storage_path))
          .map((img) => ({ storage_path: img.storage_path, alt: img.alt ?? undefined }));
        onSave({ images });
      }}
      className="space-y-3"
    >
      <p className="text-text-muted text-sm">Select the photos to show in this gallery.</p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {propertyImages.map((img) => {
          const src = imageUrl(img.storage_path);
          const checked = selected.has(img.storage_path);
          return (
            <button
              key={img.id}
              type="button"
              onClick={() => toggle(img.storage_path)}
              className={`bg-surface-subtle relative aspect-square overflow-hidden rounded-md ring-2 ${checked ? "ring-primary" : "ring-transparent"}`}
            >
              {src ? <Image src={src} alt="" fill sizes="120px" className="object-cover" /> : null}
              {checked ? (
                <span className="bg-primary text-primary-foreground absolute top-1 right-1 flex size-5 items-center justify-center rounded-full">
                  <Check className="size-3" aria-hidden="true" />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <SaveBar pending={pending} saved={saved} error={error} label="Save section" />
    </form>
  );
}
