"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { SaveBar } from "@/components/admin/save-bar";
import { PropertyMediaPicker } from "@/components/admin/block-editors/property-media-picker";
import type { BlockContent } from "@/lib/blocks";
import type { PropertyImage } from "@/lib/types/database";

const MAX_ITEMS = 5;

type Item = {
  label: string;
  value: string;
  image: { storage_path: string; alt?: string | null } | null;
  link: string | null;
};

function emptyItem(): Item {
  return { label: "", value: "", image: null, link: null };
}

export function DistancesEditor({
  content,
  onSave,
  pending,
  error,
  saved,
  propertyId,
  propertyImages,
}: {
  content: BlockContent<"distances">;
  onSave: (content: BlockContent<"distances">) => void;
  pending: boolean;
  error: string | null;
  saved: boolean;
  propertyId: string;
  propertyImages: PropertyImage[];
}) {
  const [items, setItems] = useState<Item[]>(
    content.items.length
      ? content.items.map((i) => ({ ...i, image: i.image ?? null, link: i.link ?? null }))
      : [emptyItem()],
  );
  // Own copy rather than reading propertyImages directly: a photo uploaded
  // from inside this editor should be pickable for every landmark row
  // immediately, without waiting on the Photos tab or a page refresh to hand
  // back a fresh list.
  const [pool, setPool] = useState(propertyImages);

  function patch(i: number, next: Partial<Item>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...next } : it)));
  }

  function addToPool(image: PropertyImage) {
    setPool((prev) => [image, ...prev]);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          items: items
            .filter((it) => it.label.trim() && it.value.trim())
            .map((it) => ({
              label: it.label.trim(),
              value: it.value.trim(),
              image: it.image,
              link: it.link?.trim() || null,
            })),
        });
      }}
      className="space-y-4"
    >
      <p className="text-text-muted text-sm">
        Up to {MAX_ITEMS} landmarks, shown as a photo grid — the first one leads, so put the nearest or most
        important one there. A photo is optional per landmark, and can be uploaded right here — it doesn&apos;t
        have to already be in the Photos tab. Without one the tile falls back to just the figure. A link is
        also optional — a Google Maps link is the usual case, but any URL works — and opens in a new tab when
        the tile is clicked.
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

            <Input
              type="url"
              value={item.link ?? ""}
              onChange={(e) => patch(i, { link: e.target.value || null })}
              placeholder="https://maps.app.goo.gl/… (optional)"
              aria-label={`Landmark ${i + 1} link`}
              className="h-10"
            />

            <PropertyMediaPicker
              propertyId={propertyId}
              pool={pool}
              value={item.image?.storage_path ?? null}
              onChange={(path) =>
                patch(i, {
                  image: path
                    ? { storage_path: path, alt: pool.find((p) => p.storage_path === path)?.alt ?? undefined }
                    : null,
                })
              }
              onUploaded={addToPool}
              label="Photo (optional)"
            />
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
