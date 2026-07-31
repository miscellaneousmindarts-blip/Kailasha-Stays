"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, ImageOff, Plus, Trash2, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SaveBar } from "@/components/admin/save-bar";
import { imageUrl } from "@/lib/images";
import type { BlockContent } from "@/lib/blocks";
import type { PropertyImage } from "@/lib/types/database";

const MAX_ITEMS = 5;

type Item = {
  label: string;
  value: string;
  image: { storage_path: string; alt?: string | null } | null;
};

function emptyItem(): Item {
  return { label: "", value: "", image: null };
}

export function DistancesEditor({
  content,
  onSave,
  pending,
  error,
  saved,
  propertyImages,
}: {
  content: BlockContent<"distances">;
  onSave: (content: BlockContent<"distances">) => void;
  pending: boolean;
  error: string | null;
  saved: boolean;
  propertyImages: PropertyImage[];
}) {
  const [items, setItems] = useState<Item[]>(
    content.items.length ? content.items.map((i) => ({ ...i, image: i.image ?? null })) : [emptyItem()],
  );

  function patch(i: number, next: Partial<Item>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...next } : it)));
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          items: items
            .filter((it) => it.label.trim() && it.value.trim())
            .map((it) => ({ label: it.label.trim(), value: it.value.trim(), image: it.image })),
        });
      }}
      className="space-y-4"
    >
      <p className="text-text-muted text-sm">
        Up to {MAX_ITEMS} landmarks, shown as a photo grid — the first one leads, so put the nearest or most
        important one there. A photo is optional per landmark; without one the tile falls back to just the figure.
      </p>

      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="border-border space-y-3 rounded-md border p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-text-muted text-xs font-medium">Landmark {i + 1}</p>
              <button
                type="button"
                onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
                disabled={items.length <= 1}
                aria-label={`Remove landmark ${i + 1}`}
                className="text-danger hover:bg-danger/10 pressable flex size-8 items-center justify-center rounded-md disabled:opacity-30"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                value={item.label}
                onChange={(e) => patch(i, { label: e.target.value })}
                placeholder="Baidyanath Dham Temple"
                aria-label={`Landmark ${i + 1} name`}
                className="h-10"
                required
              />
              <Input
                value={item.value}
                onChange={(e) => patch(i, { value: e.target.value })}
                placeholder="1.4 km — 15 min walk"
                aria-label={`Landmark ${i + 1} distance`}
                className="h-10"
                required
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Photo (optional)</Label>
                {item.image ? (
                  <button
                    type="button"
                    onClick={() => patch(i, { image: null })}
                    className="text-text-muted hover:text-foreground pressable inline-flex items-center gap-1 text-xs font-medium"
                  >
                    <X className="size-3" aria-hidden="true" />
                    Remove photo
                  </button>
                ) : null}
              </div>

              {propertyImages.length ? (
                <div className="grid grid-cols-5 gap-2 sm:grid-cols-7">
                  {propertyImages.map((img) => {
                    const src = imageUrl(img.storage_path);
                    const selected = item.image?.storage_path === img.storage_path;
                    return (
                      <button
                        key={img.id}
                        type="button"
                        onClick={() =>
                          patch(i, {
                            image: selected
                              ? null
                              : { storage_path: img.storage_path, alt: img.alt ?? undefined },
                          })
                        }
                        aria-label={`${selected ? "Deselect" : "Use"} photo for landmark ${i + 1}`}
                        aria-pressed={selected}
                        className={`bg-surface-subtle relative aspect-square overflow-hidden rounded-md ring-2 ${
                          selected ? "ring-primary" : "ring-transparent hover:ring-border"
                        }`}
                      >
                        {src ? (
                          <Image src={src} alt="" fill sizes="80px" className="object-cover" />
                        ) : null}
                        {selected ? (
                          <span className="bg-primary text-primary-foreground absolute top-0.5 right-0.5 flex size-4 items-center justify-center rounded-full">
                            <Check className="size-2.5" aria-hidden="true" />
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-text-muted flex items-center gap-1.5 text-xs">
                  <ImageOff className="size-3.5 shrink-0" aria-hidden="true" />
                  Upload photos in the Photos tab to add one here.
                </p>
              )}
            </div>
          </div>
        ))}

        {items.length < MAX_ITEMS ? (
          <button
            type="button"
            onClick={() => setItems((prev) => [...prev, emptyItem()])}
            className="border-border hover:bg-surface-subtle pressable flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium"
          >
            <Plus className="size-3.5" aria-hidden="true" />
            Add landmark
          </button>
        ) : (
          <p className="text-text-muted text-xs">
            That&apos;s the limit — 5 keeps the grid readable. Remove one to add a different landmark.
          </p>
        )}
      </div>

      <SaveBar pending={pending} saved={saved} error={error} label="Save section" />
    </form>
  );
}
