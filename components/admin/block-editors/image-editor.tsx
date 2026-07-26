"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, ImageOff } from "lucide-react";

import { Input } from "@/components/ui/input";
import { SaveBar } from "@/components/admin/save-bar";
import { imageUrl } from "@/lib/images";
import type { BlockContent } from "@/lib/blocks";
import type { PropertyImage } from "@/lib/types/database";

export function ImageEditor({
  content,
  onSave,
  pending,
  error,
  saved,
  propertyImages,
}: {
  content: BlockContent<"image">;
  onSave: (content: BlockContent<"image">) => void;
  pending: boolean;
  error: string | null;
  saved: boolean;
  propertyImages: PropertyImage[];
}) {
  const [storagePath, setStoragePath] = useState(content.storage_path);
  const [caption, setCaption] = useState(content.caption ?? "");
  const [alt, setAlt] = useState(content.alt ?? "");

  if (!propertyImages.length) {
    return (
      <p className="text-text-muted flex items-center gap-2 text-sm">
        <ImageOff className="size-4" aria-hidden="true" />
        Upload photos in the Photos tab first, then pick one here.
      </p>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!storagePath) return;
        onSave({ storage_path: storagePath, alt: alt || undefined, caption: caption || undefined });
      }}
      className="space-y-3"
    >
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {propertyImages.map((img) => {
          const src = imageUrl(img.storage_path);
          const selected = storagePath === img.storage_path;
          return (
            <button
              key={img.id}
              type="button"
              onClick={() => setStoragePath(img.storage_path)}
              className={`bg-surface-subtle relative aspect-square overflow-hidden rounded-md ring-2 ${selected ? "ring-primary" : "ring-transparent"}`}
            >
              {src ? <Image src={src} alt="" fill sizes="120px" className="object-cover" /> : null}
              {selected ? (
                <span className="bg-primary text-primary-foreground absolute top-1 right-1 flex size-5 items-center justify-center rounded-full">
                  <Check className="size-3" aria-hidden="true" />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <Input value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Alt text" className="h-10" />
      <Input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Caption (optional)" className="h-10" />

      <SaveBar pending={pending} saved={saved} error={error} label="Save section" />
    </form>
  );
}
