"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Check, Loader2, Plus, Upload, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { imageUrl } from "@/lib/images";
import { uploadPropertyImage } from "@/app/admin/(dashboard)/listings/[id]/actions";
import type { PropertyImage } from "@/lib/types/database";

const ALLOWED_TYPES = "image/jpeg,image/png,image/webp,image/avif";

/**
 * A small inline uploader — pick a file, optionally caption it, add it to
 * the property's photo library. Used from inside a picker (below) rather
 * than requiring a trip to the Photos tab first: a landmark card is exactly
 * the moment the admin realises they don't have the photo yet, so the upload
 * has to be reachable from right there.
 */
function UploadPanel({
  propertyId,
  onUploaded,
  onCancel,
}: {
  propertyId: string;
  onUploaded: (image: PropertyImage) => void;
  onCancel: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
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
    const formData = new FormData();
    formData.set("file", file);
    formData.set("alt", alt);
    const result = await uploadPropertyImage(propertyId, formData);
    setUploading(false);
    if (result.error || !result.image) {
      setError(result.error ?? "Upload failed.");
      return;
    }
    onUploaded(result.image);
  }

  if (!file) {
    return (
      <div className="border-border rounded-md border border-dashed">
        <input
          ref={fileRef}
          type="file"
          accept={ALLOWED_TYPES}
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) pick(f);
          }}
        />
        <div className="flex">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="hover:bg-surface-subtle pressable flex h-20 flex-1 flex-col items-center justify-center gap-1 text-sm font-medium"
          >
            <Upload className="text-text-muted size-4" aria-hidden="true" />
            Upload a photo
          </button>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel upload"
            className="hover:bg-surface-subtle pressable flex w-10 items-center justify-center"
          >
            <X className="text-text-muted size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-border space-y-2 rounded-md border p-3">
      <div className="flex gap-3">
        {/* Plain <img>: a local blob: preview, never something next/image can optimise. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={preview ?? undefined} alt="" className="bg-surface-subtle size-16 shrink-0 rounded-md object-cover" />
        <div className="min-w-0 flex-1 space-y-1">
          <Label htmlFor="pm-alt" className="text-xs">
            Alt text (optional, for screen readers)
          </Label>
          <Input
            id="pm-alt"
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            placeholder="Baba Baidyanath Dham temple entrance"
            className="h-9 text-sm"
          />
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
          Add photo
        </button>
        <button
          type="button"
          onClick={() => {
            setFile(null);
            setPreview(null);
            setError(null);
            onCancel();
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

/**
 * Picks a photo for one field, uploading a new one inline rather than only
 * choosing from what's already in the Photos tab — a "distances" landmark
 * (or any block that wants its own photo) usually needs a picture nothing
 * else on the property has used yet.
 */
export function PropertyMediaPicker({
  propertyId,
  pool,
  value,
  onChange,
  onUploaded,
  label,
  emptyLabel,
}: {
  propertyId: string;
  pool: PropertyImage[];
  value: string | null;
  onChange: (path: string | null) => void;
  /** Bubbles a freshly uploaded photo up so a shared pool can include it for every picker, not just this one. */
  onUploaded: (image: PropertyImage) => void;
  label: string;
  emptyLabel?: string;
}) {
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

      {!value && emptyLabel ? <p className="text-text-muted text-xs italic">{emptyLabel}</p> : null}

      {uploading ? (
        <UploadPanel
          propertyId={propertyId}
          onUploaded={(image) => {
            onUploaded(image);
            onChange(image.storage_path);
            setUploading(false);
          }}
          onCancel={() => setUploading(false)}
        />
      ) : (
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-7">
          <button
            type="button"
            onClick={() => setUploading(true)}
            aria-label="Upload a new photo"
            className="border-border hover:border-primary hover:bg-surface-subtle pressable flex aspect-square items-center justify-center rounded-md border border-dashed"
          >
            <Plus className="text-text-muted size-4" aria-hidden="true" />
          </button>

          {pool.map((img) => {
            const src = imageUrl(img.storage_path);
            const selected = value === img.storage_path;
            return (
              <button
                key={img.id}
                type="button"
                onClick={() => onChange(selected ? null : img.storage_path)}
                aria-label={`${selected ? "Deselect" : "Use"} ${img.alt || img.tag || "photo"}`}
                aria-pressed={selected}
                className={`bg-surface-subtle relative aspect-square overflow-hidden rounded-md ring-2 ${
                  selected ? "ring-primary" : "ring-transparent hover:ring-border"
                }`}
              >
                {src ? <Image src={src} alt="" fill sizes="80px" className="object-cover" /> : null}
                {selected ? (
                  <span className="bg-primary text-primary-foreground absolute top-0.5 right-0.5 flex size-4 items-center justify-center rounded-full">
                    <Check className="size-2.5" aria-hidden="true" />
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
