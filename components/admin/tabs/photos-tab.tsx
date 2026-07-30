"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ImagePlus, Loader2, Star, Trash2 } from "lucide-react";

import { useSaveAction } from "@/components/admin/use-save-action";
import {
  deletePropertyImage,
  reorderImages,
  setCoverImage,
  updateImageAlt,
  updateImageTag,
  uploadPropertyImage,
} from "@/app/admin/(dashboard)/listings/[id]/actions";
import { imageUrl } from "@/lib/images";
import type { PropertyImage } from "@/lib/types/database";

function PhotoCard({
  propertyId,
  image,
}: {
  propertyId: string;
  image: PropertyImage;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id });

  const del = useSaveAction(deletePropertyImage);
  const cover = useSaveAction(setCoverImage);
  const alt = useSaveAction(updateImageAlt);
  const tag = useSaveAction(updateImageTag);
  const src = imageUrl(image.storage_path);

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`border-border overflow-hidden rounded-lg border bg-background ${
        isDragging ? "shadow-overlay z-10 opacity-90" : ""
      }`}
    >
      <div className="bg-surface-subtle relative aspect-[4/3]">
        {src ? (
          <Image src={src} alt={image.alt ?? ""} fill sizes="240px" className="object-cover" />
        ) : null}
        {image.is_cover ? (
          <span className="bg-primary text-primary-foreground absolute top-2 left-2 flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium">
            <Star className="size-3" aria-hidden="true" />
            Cover
          </span>
        ) : null}
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Drag to reorder ${image.alt || image.tag || "photo"}`}
          className="pressable absolute top-2 right-2 flex size-9 cursor-grab touch-none items-center justify-center rounded-full bg-[rgba(10,10,10,0.55)] text-white hover:bg-[rgba(10,10,10,0.7)] active:cursor-grabbing"
        >
          <GripVertical className="size-4" aria-hidden="true" />
        </button>
      </div>
      <div className="space-y-2 p-3">
        <input
          type="text"
          defaultValue={image.tag ?? ""}
          placeholder="Tag shown to guests (e.g. Bedroom)"
          maxLength={40}
          onBlur={(e) => tag.run(propertyId, image.id, e.currentTarget.value)}
          className="border-border h-9 w-full rounded-md border bg-transparent px-2 text-sm"
        />
        <input
          type="text"
          defaultValue={image.alt ?? ""}
          placeholder="Alt text (for accessibility)"
          onBlur={(e) => alt.run(propertyId, image.id, e.currentTarget.value)}
          className="border-border h-9 w-full rounded-md border bg-transparent px-2 text-sm"
        />
        <div className="flex items-center justify-between gap-1">
          {!image.is_cover ? (
            <button
              type="button"
              onClick={() => cover.run(propertyId, image.id)}
              disabled={cover.pending}
              className="hover:bg-surface-subtle pressable flex h-9 items-center rounded-md px-2 text-xs font-medium"
            >
              Make cover
            </button>
          ) : (
            <span />
          )}
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
        {del.error || cover.error || alt.error || tag.error ? (
          <p role="alert" className="text-danger text-xs">
            {del.error || cover.error || alt.error || tag.error}
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

  // Optimistic order for drag-and-drop — synced from the server-fetched
  // `images` prop whenever it changes (a fresh upload, a delete, or the
  // reorder mutation below completing and refetching). Kept separate from
  // props because a drag needs to feel instant, not wait on a round trip.
  const [ordered, setOrdered] = useState(images);
  // Resets `ordered` when the server gives us a genuinely new `images` array
  // (upload, delete, or this tab's own reorder completing) — done during
  // render rather than in an effect, per React's guidance for adjusting
  // state from a prop change, so it doesn't cause an extra render pass.
  const [syncedFrom, setSyncedFrom] = useState(images);
  if (images !== syncedFrom) {
    setSyncedFrom(images);
    setOrdered(images);
  }
  const reorder = useSaveAction(reorderImages);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = ordered.findIndex((i) => i.id === active.id);
    const newIndex = ordered.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const next = arrayMove(ordered, oldIndex, newIndex);
    setOrdered(next);

    const ok = await reorder.runAndWait(
      propertyId,
      next.map((i) => i.id),
    );
    if (!ok) setOrdered(images); // roll back to last known-good order
  }

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
        grid and in search previews. Drag the{" "}
        <GripVertical className="inline size-3.5 align-text-bottom" aria-hidden="true" />{" "}
        handle to reorder; tag a photo (e.g. &quot;Bedroom&quot;) so guests
        can tell rooms apart while browsing.
      </p>

      {/* Explicit id: without one, dnd-kit's aria-describedby id comes from an
          incrementing counter that React 18 Strict Mode's dev-only
          double-render can bump differently server vs client, tripping a
          hydration mismatch. */}
      {ordered.length ? (
        <DndContext id="property-photos" sensors={sensors} onDragEnd={handleDragEnd}>
          <SortableContext items={ordered.map((i) => i.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {ordered.map((img) => (
                <PhotoCard key={img.id} propertyId={propertyId} image={img} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : null}
      {reorder.error ? (
        <p role="alert" className="text-danger text-sm">
          {reorder.error}
        </p>
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
