"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { LandingPropertyCard } from "@/components/landing/property-card";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import type { LandingProperty } from "@/lib/landing";

/**
 * Horizontal, swipeable property carousel — the "Our homes" list, shown
 * twice on the page (mid-page browse, and the closing repeat). No
 * auto-scroll: unlike the testimonial carousel, these cards are the thing a
 * visitor is choosing between, so the pace has to stay in their hands.
 *
 * The track is a native scrollable with CSS scroll-snap, so touch swipe and
 * keyboard arrow-keys (a browser default on a focused scroll container) work
 * with zero JS. The prev/next buttons are a pointer-device convenience layered
 * on top — hidden on touch-sized viewports, and hidden entirely once there's
 * nothing left to scroll to.
 */
export function PropertyCarousel({
  properties,
  section,
  compact = false,
  ariaLabel,
  className = "mt-8",
}: {
  properties: LandingProperty[];
  section: string;
  compact?: boolean;
  ariaLabel: string;
  className?: string;
}) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const reducedMotion = useReducedMotion();

  function updateEdges() {
    const el = trackRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 8);
    setCanNext(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  }

  useEffect(() => {
    updateEdges();
    const el = trackRef.current;
    if (!el) return;
    const observer = new ResizeObserver(updateEdges);
    observer.observe(el);
    return () => observer.disconnect();
  }, [properties.length]);

  function scrollByPage(direction: 1 | -1) {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({
      left: direction * el.clientWidth * 0.9,
      behavior: reducedMotion ? "auto" : "smooth",
    });
  }

  const showArrows = canPrev || canNext;
  const cardWidth = compact
    ? "w-[78%] max-w-[300px] sm:w-[280px]"
    : "w-[82%] max-w-[360px] sm:w-[340px]";

  return (
    <div className={`relative ${className}`}>
      <ul
        ref={trackRef}
        role="region"
        aria-roledescription="carousel"
        aria-label={ariaLabel}
        tabIndex={0}
        onScroll={updateEdges}
        className="no-scrollbar flex snap-x gap-4 overflow-x-auto scroll-px-6 px-6 pb-2 [scroll-snap-type:x_mandatory] md:scroll-px-0 md:px-0"
      >
        {properties.map((property) => (
          <li key={property.id} className={`shrink-0 snap-start ${cardWidth}`}>
            <LandingPropertyCard property={property} section={section} compact={compact} />
          </li>
        ))}
      </ul>

      {showArrows ? (
        <>
          <button
            type="button"
            onClick={() => scrollByPage(-1)}
            disabled={!canPrev}
            aria-label={`Previous — ${ariaLabel}`}
            className="border-border bg-surface pressable absolute top-[38%] -left-2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full border shadow-md disabled:pointer-events-none disabled:opacity-0 sm:flex"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => scrollByPage(1)}
            disabled={!canNext}
            aria-label={`Next — ${ariaLabel}`}
            className="border-border bg-surface pressable absolute top-[38%] -right-2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full border shadow-md disabled:pointer-events-none disabled:opacity-0 sm:flex"
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
        </>
      ) : null}
    </div>
  );
}
