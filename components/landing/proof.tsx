import { ArrowRight, Star } from "lucide-react";

import { Section } from "@/components/landing/primitives";
import { landingConfig } from "@/lib/landing-config";
import type { Copy } from "@/lib/homepage";

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

/**
 * The proof ladder. Every rung renders only when there is real content for
 * it — the biggest single conversion gain in this category is getting from 0
 * to 10 reviews, and a visibly low count converts worse than no count at all,
 * so an empty rung is dropped rather than padded.
 */
export function Proof({ copy }: { copy: Copy }) {
  const { proof, host } = landingConfig;
  const showRating = proof.googleRating !== null && proof.googleCount >= 10;
  const hasSummary =
    showRating || proof.familiesHosted !== null || proof.repeatPct !== null;

  // Nothing truthful to show yet — better an absent section than a hollow one.
  if (!hasSummary && !proof.reviews.length) return null;

  return (
    <Section>
      <h2 className="mt-3 max-w-2xl font-display text-[26px] leading-[1.15] font-semibold md:text-[36px]">
        {copy(
          "heading",
          proof.familiesHosted && proof.yearStarted
            ? `${proof.familiesHosted} families have stayed here since ${proof.yearStarted}.`
            : "What families tell us afterwards.",
        )}
      </h2>

      {hasSummary ? (
        <div className="border-border bg-surface mt-6 flex flex-wrap gap-x-8 gap-y-3 rounded-lg border p-5">
          {showRating ? (
            <p className="flex items-center gap-1.5 font-medium">
              <Star className="text-warning size-4 fill-current" aria-hidden="true" />
              {proof.googleRating} on Google ({proof.googleCount})
            </p>
          ) : null}
          {proof.mmtRating !== null ? (
            <p className="flex items-center gap-1.5 font-medium">
              <Star className="text-warning size-4 fill-current" aria-hidden="true" />
              {proof.mmtRating} on MakeMyTrip
            </p>
          ) : null}
          {proof.familiesHosted !== null ? (
            <p className="font-medium">{proof.familiesHosted} families hosted</p>
          ) : null}
          {proof.repeatPct !== null ? (
            <p className="font-medium">{proof.repeatPct}% come back</p>
          ) : null}
        </div>
      ) : null}

      {proof.reviews.length ? (
        <ul className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {proof.reviews.map((review, i) => (
            <li key={i} className="border-border bg-surface rounded-lg border p-5">
              <Stars count={review.stars} />
              <blockquote className="mt-3 leading-relaxed">
                {review.quote}
              </blockquote>
              <p className="text-text-muted mt-3 text-sm">
                <span className="text-foreground font-medium">{review.name}</span>
                {review.city ? ` · ${review.city}` : ""}
              </p>
              {/* A reply is the accountability proof this market's incumbents
                  are specifically criticised for lacking. */}
              {review.reply ? (
                <div className="bg-surface-subtle mt-3 rounded-md p-3 text-sm">
                  <p className="font-medium">Reply from {host.name || "the host"}</p>
                  <p className="text-text-muted mt-1">{review.reply}</p>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {proof.googleReviewUrl ? (
        <a
          href={proof.googleReviewUrl}
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
