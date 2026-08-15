import { Section } from "@/components/landing/primitives";
import { ComparisonTable } from "@/components/landing/comparison-table";
import type { ResolvedPlatformComparison } from "@/lib/platform-sections";

/**
 * docs/apex-page-plan.md §S7. The table itself is lifted verbatim from the
 * Kailasha tenant page's original comparison rows — the strategy doc singles
 * this section out to keep unchanged, because conceding "Cost for 6 people,
 * 3 nights: Mid" rather than claiming to be cheapest is the most persuasive
 * cell in it. Still editable via lib/platform-sections.ts's `comparison`
 * schema: that argument is a reason to default it faithfully, not to lock it.
 */
export function ComparisonSection({ content }: { content: ResolvedPlatformComparison }) {
  return (
    <Section band="sand">
      <div className="mx-auto max-w-[760px]">
        <h2 className="font-display text-[26px] leading-[1.15] font-semibold md:text-[36px]">
          {content.heading}
        </h2>
        <p className="text-text-muted mt-3 max-w-2xl">{content.lede}</p>
        <ComparisonTable rows={content.rows} />
      </div>
    </Section>
  );
}
