"use client";

import { useSyncExternalStore } from "react";
import Image from "next/image";
import { Star } from "lucide-react";

import { BLUR_DATA_URL } from "@/lib/images";
import type { ResolvedProof } from "@/lib/homepage";

type Review = ResolvedProof["reviews"][number];

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * useSyncExternalStore, not useState+useEffect: matchMedia is genuinely
 * external, client-only state, which is exactly what this hook is for. It
 * avoids two problems a state+effect version would have — setting state
 * synchronously inside an effect (flagged by this project's lint rule), and a
 * hydration mismatch from guessing `false` during SSR and then discovering
 * the real value on the client after the animated markup already rendered.
 */
function subscribeReducedMotion(callback: () => void) {
  const mq = window.matchMedia(REDUCED_MOTION_QUERY);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}
function getReducedMotionSnapshot() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}
function getReducedMotionServerSnapshot() {
  // true, not false: this is also what pre-hydration first paint uses, and a
  // motion-sensitive visitor seeing a still carousel for a moment is the
  // correct failure mode — the reverse (a moment of unwanted auto-scroll)
  // is exactly what "no auto-scroll at all" rules out.
  return true;
}

function Stars({ count }: { count: number }) {
  return (
    <span className="flex gap-0.5" aria-label={`${count} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          aria-hidden="true"
          className={`size-4 ${i < count ? "text-warning fill-current" : "text-border fill-current"}`}
        />
      ))}
    </span>
  );
}

function ReviewCard({ review, hidden }: { review: Review; hidden?: boolean }) {
  return (
    <li
      role="group"
      aria-roledescription="slide"
      aria-hidden={hidden}
      aria-label={hidden ? undefined : `Review from ${review.name}`}
      className="border-border bg-surface w-[280px] shrink-0 snap-start rounded-lg border p-5 sm:w-[320px]"
    >
      <div className="flex items-center gap-3">
        {review.image ? (
          <div className="bg-surface-subtle relative size-10 shrink-0 overflow-hidden rounded-full">
            <Image
              src={review.image.url}
              alt=""
              fill
              sizes="40px"
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
              className="object-cover"
            />
          </div>
        ) : null}
        <div className="min-w-0">
          <p className="truncate font-medium">{review.name}</p>
          {review.city ? <p className="text-text-muted text-xs">{review.city}</p> : null}
        </div>
      </div>

      <div className="mt-3">
        <Stars count={review.stars} />
      </div>
      <blockquote className="mt-2 text-sm leading-relaxed">{review.quote}</blockquote>

      {/* A reply is the accountability proof this market's incumbents are
          specifically criticised for lacking. */}
      {review.reply ? (
        <div className="bg-surface-subtle mt-3 rounded-md p-3 text-sm">
          <p className="font-medium">Reply from the host</p>
          <p className="text-text-muted mt-1">{review.reply}</p>
        </div>
      ) : null}
    </li>
  );
}

/**
 * Horizontal, mostly-auto-scrolling review carousel.
 *
 * Three behaviours are non-negotiable (project rules, not preferences):
 *   - prefers-reduced-motion: reduce disables auto-scroll entirely — this
 *     branches to a plain scrollable row, not a slower animation. A CSS
 *     animation clamped to ~0ms and left looping would flicker, which is
 *     worse than no animation.
 *   - Pause on hover AND on focus-within, so a keyboard user tabbing into
 *     the region gets a still target to read.
 *   - Every card must be reachable without the auto-scroll: the track itself
 *     is a native scrollable, keyboard-focusable region (arrow-key scrolling
 *     is a browser default on a focused scroll container), so nothing here
 *     depends on the animation to be seen.
 *
 * Below ~3 reviews the loop reads as broken (you'd see the same two cards
 * twice in one screen), so anything under that renders as a plain row too.
 */
export function ReviewsCarousel({
  reviews,
  enabled,
  speedSeconds,
  pauseOnHover,
}: {
  reviews: Review[];
  enabled: boolean;
  speedSeconds: number;
  pauseOnHover: boolean;
}) {
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );

  const shouldAnimate = enabled && !reducedMotion && reviews.length >= 3;

  if (!shouldAnimate) {
    return (
      <ul
        role="region"
        aria-label="Guest reviews"
        tabIndex={0}
        className="no-scrollbar mt-6 flex gap-4 overflow-x-auto scroll-px-6 px-6 pb-1 [scroll-snap-type:x_mandatory] md:px-0"
      >
        {reviews.map((review, i) => (
          <ReviewCard key={i} review={review} />
        ))}
      </ul>
    );
  }

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Guest reviews"
      tabIndex={0}
      className="group mt-6 overflow-hidden"
    >
      <ul
        className={`flex w-max gap-4 will-change-transform ${
          pauseOnHover ? "group-hover:[animation-play-state:paused]" : ""
        } group-focus-within:[animation-play-state:paused]`}
        style={{
          animationName: "marquee",
          animationDuration: `${speedSeconds}s`,
          animationTimingFunction: "linear",
          animationIterationCount: "infinite",
        }}
      >
        {reviews.map((review, i) => (
          <ReviewCard key={`a-${i}`} review={review} />
        ))}
        {/* Exact duplicate, hidden from assistive tech, so translating by
            -50% loops seamlessly at the boundary. */}
        {reviews.map((review, i) => (
          <ReviewCard key={`b-${i}`} review={review} hidden />
        ))}
      </ul>
    </div>
  );
}
