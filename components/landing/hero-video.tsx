"use client";

import { useReducedMotion } from "@/lib/use-reduced-motion";

/**
 * Background video behind the hero copy.
 *
 * A looping background clip is decorative motion the visitor never asked
 * for, so `prefers-reduced-motion: reduce` doesn't get a slower version —
 * it gets a still. Pausing a <video> still shows its first frame, which is
 * exactly the right fallback: the composition is unchanged, nothing moves.
 *
 * Autoplay only works muted, and `playsInline` is what stops iOS from
 * yanking a background video into its own fullscreen player mid-scroll.
 */
export function HeroVideo({ src, alt }: { src: string; alt: string }) {
  const reducedMotion = useReducedMotion();

  return (
    <video
      key={src}
      src={src}
      autoPlay={!reducedMotion}
      muted
      loop
      playsInline
      // metadata, not auto: the hero's job is to render its copy fast, and
      // the H1 shouldn't queue behind however many megabytes of video.
      preload="metadata"
      aria-label={alt}
      className="absolute inset-0 -z-10 size-full object-cover"
    />
  );
}
