"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, Plus, X } from "lucide-react";

import { useMediaLibrary } from "@/components/admin/homepage/media-library-context";
import { UploadPanel } from "@/components/admin/homepage/upload-panel";
import { homepageImageUrl } from "@/lib/images";

/**
 * Picks one image for one field, from the shared homepage media library —
 * every image field on the homepage (builtin sections and custom layouts
 * alike) uses this same component, so there is exactly one place a photo
 * gets uploaded and exactly one library it's chosen from.
 */
export function MediaPicker({
  value,
  onChange,
  label,
  hint,
  emptyLabel,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
  label: string;
  hint?: string;
  /** Shown when nothing is chosen and there's a code-level fallback worth naming. */
  emptyLabel?: string;
}) {
  const { pool } = useMediaLibrary();
  const [uploading, setUploading] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium">{label}</p>
        {value ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-text-muted hover:text-foreground pressable inline-flex items-center gap-1 text-xs font-medium"
          >
            <X className="size-3" aria-hidden="true" />
            Remove
          </button>
        ) : null}
      </div>

      {hint ? <p className="text-text-muted text-xs">{hint}</p> : null}
      {!value && emptyLabel ? <p className="text-text-muted text-xs italic">{emptyLabel}</p> : null}

      {uploading ? (
        <UploadPanel
          onUploaded={(image) => {
            onChange(image.id);
            setUploading(false);
          }}
          onCancel={() => setUploading(false)}
        />
      ) : (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          <button
            type="button"
            onClick={() => setUploading(true)}
            aria-label="Upload a new photo"
            className="border-border hover:border-primary hover:bg-surface-subtle pressable flex aspect-square items-center justify-center rounded-md border border-dashed"
          >
            <Plus className="text-text-muted size-5" aria-hidden="true" />
          </button>

          {pool.map((choice) => {
            const src = homepageImageUrl(choice.storage_path);
            const selected = value === choice.id;
            const title = choice.title || choice.alt || "Untitled photo";
            return (
              <button
                key={choice.id}
                type="button"
                onClick={() => onChange(selected ? null : choice.id)}
                aria-label={`${selected ? "Deselect" : "Use"} ${title}`}
                aria-pressed={selected}
                title={title}
                className={`bg-surface-subtle relative aspect-square overflow-hidden rounded-md ring-2 ${
                  selected ? "ring-primary" : "ring-transparent hover:ring-border"
                }`}
              >
                {src ? (
                  <Image src={src} alt="" fill sizes="120px" className="object-cover" />
                ) : null}
                {selected ? (
                  <span className="bg-primary text-primary-foreground absolute top-1 right-1 flex size-5 items-center justify-center rounded-full">
                    <Check className="size-3" aria-hidden="true" />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
