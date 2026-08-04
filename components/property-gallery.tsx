"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Grid3x3, X } from "lucide-react";

import { MediaFill } from "@/components/media/media-fill";
import { imageUrl } from "@/lib/images";
import { isVideoPath } from "@/lib/media";
import type { PropertyImage } from "@/lib/types/database";

type GalleryImage = { src: string; alt: string; tag: string | null };

/**
 * Small pill in the corner of a photo — "Bedroom", "Balcony" — so guests can
 * tell rooms apart while scanning without opening each one. Position and
 * size are required from the caller rather than defaulted: Tailwind class
 * precedence depends on stylesheet order, not on where a class appears in
 * the attribute string, so an appended override (e.g. "bottom-4" meant to
 * beat a baked-in "bottom-2") isn't guaranteed to win.
 */
function TagBadge({ tag, className }: { tag: string | null; className: string }) {
  if (!tag) return null;
  return (
    <span
      className={`pointer-events-none absolute rounded-full bg-[rgba(10,10,10,0.6)] px-2 py-1 font-medium text-white backdrop-blur-sm ${className}`}
    >
      {tag}
    </span>
  );
}

/**
 * Full-screen photo viewer. The scroll position is the source of truth for
 * which photo is showing — swiping/dragging the strip IS the navigation,
 * not a gesture layered on top of button-driven state. Prev/Next and the
 * keyboard just scroll to a target index and let the same onScroll handler
 * that tracks a swipe update the counter; there's no separate "which index"
 * state to keep in sync by hand.
 */
function Lightbox({
  photos,
  title,
  initialIndex,
  onClose,
}: {
  photos: GalleryImage[];
  title: string;
  initialIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Jump to the opened photo before the browser paints, so there's no
  // flash of photo 1 before landing on the one the guest actually clicked.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = initialIndex * el.clientWidth;
    // Only ever run once, on open — re-running on every render would fight
    // the user's own scrolling.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollToIndex = useCallback((i: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  }, []);

  const step = useCallback(
    (delta: number) => scrollToIndex((index + delta + photos.length) % photos.length),
    [index, photos.length, scrollToIndex],
  );

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || el.clientWidth === 0) return;
    const next = Math.min(
      photos.length - 1,
      Math.max(0, Math.round(el.scrollLeft / el.clientWidth)),
    );
    setIndex((current) => (current === next ? current : next));
  }, [photos.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
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
  }, [onClose, step]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${title} — photo ${index + 1} of ${photos.length}`}
      className="fixed inset-0 z-50 flex flex-col bg-[rgba(10,10,10,0.97)] duration-200 animate-in fade-in"
      onClick={onClose}
    >
      <div className="flex h-16 shrink-0 items-center justify-between px-4 text-white">
        <span className="tabular text-sm">
          {index + 1} / {photos.length}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="flex size-11 items-center justify-center rounded-full hover:bg-[rgba(255,255,255,0.1)]"
          aria-label="Close photos"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        onClick={(e) => e.stopPropagation()}
        className="no-scrollbar flex flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
      >
        {photos.map((photo, i) => (
          <div key={i} className="relative h-full w-full shrink-0 snap-center">
            {/* Only the visible slide plays — starting every clip in the strip
                at once would burn bandwidth on media nobody is looking at. */}
            <MediaFill
              src={photo.src}
              alt={photo.alt}
              sizes="100vw"
              priority={i === initialIndex}
              fit="contain"
              play={i === index}
              controls={isVideoPath(photo.src)}
              badge={false}
            />
            <TagBadge tag={photo.tag} className="bottom-4 left-4 text-sm" />
          </div>
        ))}
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
  );
}

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
  images: Pick<PropertyImage, "storage_path" | "alt" | "tag">[];
  title: string;
}) {
  const photos: GalleryImage[] = images
    .map((img) => ({
      src: imageUrl(img.storage_path) ?? "",
      alt: img.alt ?? title,
      tag: img.tag,
    }))
    .filter((img) => img.src);

  const [openAt, setOpenAt] = useState<number | null>(null);
  const close = () => setOpenAt(null);

  if (!photos.length) return null;

  const [hero, ...rest] = photos;
  const hasVideo = photos.some((p) => isVideoPath(p.src));
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
            aria-label={`Open ${isVideoPath(photo.src) ? "video" : "photo"} ${i + 1} of ${photos.length}`}
          >
            <MediaFill
              src={photo.src}
              alt={photo.alt}
              sizes="85vw"
              priority={i === 0}
            />
            <TagBadge tag={photo.tag} className="bottom-2 left-2 text-xs" />
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
          <MediaFill
            src={hero.src}
            alt={hero.alt}
            sizes={thumbs.length ? "50vw" : "100vw"}
            priority
            className="transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
          />
          <TagBadge tag={hero.tag} className="bottom-2 left-2 text-xs" />
        </button>

        {thumbs.map((photo, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setOpenAt(i + 1)}
            className={`bg-surface-subtle group relative overflow-hidden ${layout.thumbs[i]}`}
            aria-label={`Open ${isVideoPath(photo.src) ? "video" : "photo"} ${i + 2}`}
          >
            <MediaFill
              src={photo.src}
              alt={photo.alt}
              sizes="25vw"
              className="transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
            />
            <TagBadge tag={photo.tag} className="bottom-2 left-2 text-xs" />
          </button>
        ))}

        {photos.length > 1 ? (
          <button
            type="button"
            onClick={() => setOpenAt(0)}
            className="bg-background shadow-card hover:bg-surface-subtle pressable absolute right-4 bottom-4 flex h-11 items-center gap-2 rounded-md px-4 text-sm font-medium"
          >
            <Grid3x3 className="size-4" aria-hidden="true" />
            Show all {photos.length} {hasVideo ? "photos & videos" : "photos"}
          </button>
        ) : null}
      </div>

      {openAt !== null ? (
        <Lightbox photos={photos} title={title} initialIndex={openAt} onClose={close} />
      ) : null}
    </>
  );
}
