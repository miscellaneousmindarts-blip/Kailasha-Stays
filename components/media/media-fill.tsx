"use client";

import Image from "next/image";
import { Play } from "lucide-react";

import { BLUR_DATA_URL } from "@/lib/images";
import { isVideoPath } from "@/lib/media";

/**
 * Drop-in replacement for a `fill` next/image in the places that now accept a
 * video as well as a photo. Same absolute-fill contract, so every existing
 * `relative` + aspect-ratio wrapper keeps working untouched.
 *
 * Thumbnails deliberately do NOT autoplay. A grid of self-starting videos is
 * both a bandwidth problem and a visual one — several things moving at once
 * with no way to tell which is which. `preload="metadata"` gets the first
 * frame, and the corner badge says it's a video, which is what a thumbnail
 * needs to communicate. Playback belongs to the lightbox.
 */
export function MediaFill({
  src,
  alt,
  sizes,
  priority,
  className = "",
  fit = "cover",
  play = false,
  controls = false,
  badge = true,
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  fit?: "cover" | "contain";
  /** Autoplay muted on loop — for the one video actually being viewed. */
  play?: boolean;
  controls?: boolean;
  /** The corner "video" marker. Off once it's obviously playing. */
  badge?: boolean;
}) {
  const objectFit = fit === "cover" ? "object-cover" : "object-contain";

  if (!isVideoPath(src)) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        loading={priority ? undefined : "lazy"}
        placeholder="blur"
        blurDataURL={BLUR_DATA_URL}
        className={`${objectFit} ${className}`}
      />
    );
  }

  return (
    <>
      <video
        src={src}
        // Muted is what makes autoplay permitted at all; playsInline stops
        // iOS from hijacking it into its own fullscreen player.
        muted
        loop
        playsInline
        autoPlay={play}
        controls={controls}
        preload="metadata"
        aria-label={alt}
        className={`absolute inset-0 size-full ${objectFit} ${className}`}
      />
      {badge ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-[rgba(10,10,10,0.6)] text-white backdrop-blur-sm"
        >
          <Play className="size-3.5 fill-current" />
        </span>
      ) : null}
    </>
  );
}
