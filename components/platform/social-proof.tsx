import { Star } from "lucide-react";

import { Eyebrow, Section } from "@/components/landing/primitives";
import type { ResolvedPlatformSocialProof } from "@/lib/platform-sections";

/**
 * docs/apex-page-plan.md §S10. No aggregate figure ("★ 4.8 average from 56
 * reviews") is shown — none exists anywhere in the database to back one, and
 * an unbacked AggregateRating claim is exactly the kind of thing this page
 * is otherwise built to avoid. The reviews speak for themselves instead.
 *
 * `content` is null when the section has zero reviews (resolveSocialProof()
 * in lib/platform-sections.ts) — an eyebrow over an empty grid is worse than
 * no section, same "absent rather than hollow" rule the tenant builder's
 * Proof section follows.
 */
export function SocialProof({ content }: { content: ResolvedPlatformSocialProof | null }) {
  if (!content) return null;

  return (
    <Section band="sand">
      <Eyebrow en={content.eyebrow} />

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {content.reviews.map((review) => (
          <div key={review.name} className="bg-surface border-border rounded-xl border p-5">
            <div className="flex items-center gap-0.5" aria-hidden="true">
              {Array.from({ length: review.stars }).map((_, i) => (
                <Star key={i} className="text-primary size-3.5 fill-current" />
              ))}
            </div>
            <p className="mt-3 text-sm leading-relaxed">{review.quote}</p>
            <p className="mt-3 text-sm font-medium">{review.name}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
