"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, Plus, X } from "lucide-react";

import { usePlatformMediaLibrary } from "@/components/superadmin/homepage/platform-media-library-context";
import { PlatformUploadPanel } from "@/components/superadmin/homepage/platform-upload-panel";
import { homepageImageUrl } from "@/lib/images";

/**
 * Same as components/admin/homepage/media-picker.tsx, against the apex's own
 * library. No `allowVideo` prop — every platform image field is a still
 * photo (see uploadPlatformImage()'s comment).
 */
export function PlatformMediaPicker({
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
  emptyLabel?: string;
}) {
  const { pool } = usePlatformMediaLibrary();
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
        <PlatformUploadPanel
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
      )}
    </div>
  );
}
