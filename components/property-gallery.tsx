"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Grid3x3, X } from "lucide-react";

import { BLUR_DATA_URL, imageUrl } from "@/lib/images";
import type { PropertyImage } from "@/lib/types/database";

type GalleryImage = { src: string; alt: string };

/**
 * Desktop composite grid adapts to how many photos actually exist instead of
 * assuming 5 and leaving dead space — 1 photo fills the whole frame, 2 makes
 * two equal panels, 3/4 fill in around the hero, 5+ is the classic 1-large
 * plus 2x2-small Airbnb layout. All cells share one 4-col x 2-row grid so the
 * rounded outer corners stay consistent regardless of count.
 */
function galleryLayout(count: number): { hero: string; thumbs: string[] } {
  switch (Math.min(count, 5)) {
    case 1:
      return { hero: "col-span-4 row-span-2 rounded-lg", thumbs: [] };
    case 2:
      return {
        hero: "col-span-2 row-span-2 rounded-l-lg",
        thumbs: ["col-span-2 row-span-2 rounded-r-lg"],
      };
    case 3:
      return {
        hero: "col-span-2 row-span-2 rounded-l-lg",
        thumbs: [
          "col-span-2 row-span-1 rounded-tr-lg",
          "col-span-2 row-span-1 rounded-br-lg",
        ],
      };
    case 4:
      return {
        hero: "col-span-2 row-span-2 rounded-l-lg",
        thumbs: [
          "col-span-2 row-span-1 rounded-tr-lg",
          "col-span-1 row-span-1",
          "col-span-1 row-span-1 rounded-br-lg",
        ],
      };
    default:
      return {
        hero: "col-span-2 row-span-2 rounded-l-lg",
        thumbs: [
          "col-span-1 row-span-1",
          "col-span-1 row-span-1 rounded-tr-lg",
          "col-span-1 row-span-1",
          "col-span-1 row-span-1 rounded-br-lg",
        ],
      };
  }
}
export function PropertyGallery({
  images,
  title,
}: {
  images: Pick<PropertyImage, "storage_path" | "alt">[];
  title: string;
}) {
  const photos: GalleryImage[] = images
    .map((img) => ({
      src: imageUrl(img.storage_path) ?? "",
      alt: img.alt ?? title,
    }))
    .filter((img) => img.src);

  const [openAt, setOpenAt] = useState<number | null>(null);

  const close = useCallback(() => setOpenAt(null), []);
  const step = useCallback(
    (delta: number) =>
      setOpenAt((current) =>
        current === null
          ? null
          : (current + delta + photos.length) % photos.length,
      ),
    [photos.length],
  );

  useEffect(() => {
    if (openAt === null) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    document.addEventListener("keydown", onKey);

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [openAt, close, step]);

  if (!photos.length) return null;

  const [hero, ...rest] = photos;
  const layout = galleryLayout(photos.length);
  const thumbs = rest.slice(0, layout.thumbs.length);
  const heroAspect = photos.length <= 2 ? "aspect-[16/10]" : "aspect-[4/3]";

  return (
    <>
      {/* mobile: swipeable strip */}
      <div className="-mx-6 flex snap-x snap-mandatory gap-2 overflow-x-auto px-6 pb-1 md:hidden">
        {photos.map((photo, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setOpenAt(i)}
            className="bg-surface-subtle relative aspect-[4/3] w-[85%] shrink-0 snap-center overflow-hidden rounded-lg"
            aria-label={`Open photo ${i + 1} of ${photos.length}`}
          >
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              sizes="85vw"
              priority={i === 0}
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
              className="object-cover"
            />
          </button>
        ))}
      </div>

      {/* desktop: grid shape adapts to the actual photo count — no dead space */}
      <div
        className={`relative hidden gap-2 md:grid md:grid-cols-4 md:grid-rows-2 ${heroAspect}`}
      >
        <button
          type="button"
          onClick={() => setOpenAt(0)}
          className={`bg-surface-subtle group relative overflow-hidden ${layout.hero}`}
          aria-label="Open photo 1"
        >
          <Image
            src={hero.src}
            alt={hero.alt}
            fill
            sizes={thumbs.length ? "50vw" : "100vw"}
            priority
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
            className="object-cover transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
          />
        </button>

        {thumbs.map((photo, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setOpenAt(i + 1)}
            className={`bg-surface-subtle group relative overflow-hidden ${layout.thumbs[i]}`}
            aria-label={`Open photo ${i + 2}`}
          >
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              sizes="25vw"
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
              className="object-cover transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
            />
          </button>
        ))}

        {photos.length > 1 ? (
          <button
            type="button"
            onClick={() => setOpenAt(0)}
            className="bg-background shadow-card hover:bg-surface-subtle pressable absolute right-4 bottom-4 flex h-11 items-center gap-2 rounded-md px-4 text-sm font-medium"
          >
            <Grid3x3 className="size-4" aria-hidden="true" />
            Show all {photos.length} photos
          </button>
        ) : null}
      </div>

      {/* lightbox */}
      {openAt !== null ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${title} — photo ${openAt + 1} of ${photos.length}`}
          className="fixed inset-0 z-50 flex flex-col bg-[rgba(10,10,10,0.97)] duration-200 animate-in fade-in"
          onClick={close}
        >
          <div className="flex h-16 shrink-0 items-center justify-between px-4 text-white">
            <span className="tabular text-sm">
              {openAt + 1} / {photos.length}
            </span>
            <button
              type="button"
              onClick={close}
              className="flex size-11 items-center justify-center rounded-full hover:bg-[rgba(255,255,255,0.1)]"
              aria-label="Close photos"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>

          <div
            className="relative flex-1"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={photos[openAt].src}
              alt={photos[openAt].alt}
              fill
              sizes="100vw"
              className="object-contain"
            />
          </div>

          {photos.length > 1 ? (
            <div
              className="flex h-20 shrink-0 items-center justify-center gap-4 text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => step(-1)}
                className="flex size-12 items-center justify-center rounded-full bg-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.2)]"
                aria-label="Previous photo"
              >
                <ChevronLeft className="size-6" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                className="flex size-12 items-center justify-center rounded-full bg-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.2)]"
                aria-label="Next photo"
              >
                <ChevronRight className="size-6" aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
