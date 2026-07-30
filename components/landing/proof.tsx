import { ArrowRight, Star } from "lucide-react";

import { Section } from "@/components/landing/primitives";
import { ReviewsCarousel } from "@/components/landing/reviews-carousel";
import type { ResolvedProof } from "@/lib/homepage";

/**
 * The proof ladder. Every rung renders only when there is real content for
 * it — the biggest single conversion gain in this category is getting from 0
 * to 10 reviews, and a visibly low count converts worse than no count at all,
 * so an empty rung is dropped rather than padded.
 *
 * resolveProof() in lib/homepage.ts already applies the "nothing truthful yet"
 * gate, so `resolved === null` is the only case this component handles itself.
 */
export function Proof({ resolved }: { resolved: ResolvedProof | null }) {
  if (!resolved) return null;
  const { stats } = resolved;
  const showRating = stats.googleRating !== null && stats.googleCount >= 10;
  const hasSummary = showRating || stats.familiesHosted !== null || stats.repeatPct !== null;

  return (
    <Section>
      <h2 className="mt-3 max-w-2xl font-display text-[26px] leading-[1.15] font-semibold md:text-[36px]">
        {resolved.heading}
      </h2>

      {hasSummary ? (
        <div className="border-border bg-surface mt-6 flex flex-wrap gap-x-8 gap-y-3 rounded-lg border p-5">
          {showRating ? (
            <p className="flex items-center gap-1.5 font-medium">
              <Star className="text-warning size-4 fill-current" aria-hidden="true" />
              {stats.googleRating} on Google ({stats.googleCount})
            </p>
          ) : null}
          {stats.mmtRating !== null ? (
            <p className="flex items-center gap-1.5 font-medium">
              <Star className="text-warning size-4 fill-current" aria-hidden="true" />
              {stats.mmtRating} on MakeMyTrip
            </p>
          ) : null}
          {stats.familiesHosted !== null ? (
            <p className="font-medium">{stats.familiesHosted} families hosted</p>
          ) : null}
          {stats.repeatPct !== null ? (
            <p className="font-medium">{stats.repeatPct}% come back</p>
          ) : null}
        </div>
      ) : null}

      {resolved.reviews.length ? (
        <ReviewsCarousel
          reviews={resolved.reviews}
          enabled={resolved.carousel.enabled}
          speedSeconds={resolved.carousel.speedSeconds}
          pauseOnHover={resolved.carousel.pauseOnHover}
        />
      ) : null}

      {stats.googleReviewUrl ? (
        <a
          href={stats.googleReviewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary pressable mt-6 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium underline-offset-2 hover:underline"
        >
          Read all reviews on Google
          <ArrowRight className="size-4" aria-hidden="true" />
        </a>
      ) : null}
    </Section>
  );
}
