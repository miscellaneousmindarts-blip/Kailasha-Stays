"use client";

import Image from "next/image";
import { Check, ImageOff, X } from "lucide-react";

import { imageUrl } from "@/lib/images";

export type ImageChoice = {
  storage_path: string;
  label: string;
  alt: string | null;
};

/**
 * Picks a homepage photo from the ones already uploaded to the properties.
 *
 * Deliberately not a fresh upload widget: every photo the homepage should show
 * is a photo of a property, and those are already in the Photos tab with alt
 * text and tags the owner wrote. A second upload path would mean a second place
 * to maintain the same images, and the landing page's image budget makes
 * duplicates actively expensive.
 */
export function ImagePicker({
  pool,
  value,
  onChange,
  label,
  hint,
  emptyLabel,
}: {
  pool: ImageChoice[];
  value: string | null;
  onChange: (path: string | null) => void;
  label: string;
  hint?: string;
  /** Shown in place of the grid when the built-in default is in use. */
  emptyLabel?: string;
}) {
  if (!pool.length) {
    return (
      <div className="space-y-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-text-muted flex items-center gap-2 text-sm">
          <ImageOff className="size-4 shrink-0" aria-hidden="true" />
          Upload photos to a listing first, then pick one here.
        </p>
      </div>
    );
  }

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
            Use the default
          </button>
        ) : null}
      </div>

      {hint ? <p className="text-text-muted text-xs">{hint}</p> : null}
      {!value && emptyLabel ? (
        <p className="text-text-muted text-xs italic">{emptyLabel}</p>
      ) : null}

      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {pool.map((choice) => {
          const src = imageUrl(choice.storage_path);
          const selected = value === choice.storage_path;
          return (
            <button
              key={choice.storage_path}
              type="button"
              onClick={() => onChange(selected ? null : choice.storage_path)}
              // The label carries the property and tag, so a picker with forty
              // near-identical bedrooms is still navigable by screen reader.
              aria-label={`${selected ? "Deselect" : "Use"} ${choice.label}`}
              aria-pressed={selected}
              title={choice.label}
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
    </div>
  );
}
