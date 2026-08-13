import { Section } from "@/components/landing/primitives";
import { ComparisonTable } from "@/components/landing/comparison-table";
import { PLATFORM_COMPARISON_ROWS } from "@/lib/platform-content";

/**
 * docs/apex-page-plan.md §S7. The table itself is lifted verbatim from the
 * Kailasha tenant page (lib/platform-content.ts's PLATFORM_COMPARISON_ROWS) —
 * the strategy doc singles this section out to keep unchanged, because
 * conceding "Cost for 6 people, 3 nights: Mid" rather than claiming to be
 * cheapest is the most persuasive cell in it.
 */
export function ComparisonSection() {
  return (
    <Section band="sand">
      <div className="mx-auto max-w-[760px]">
        <h2 className="font-display text-[26px] leading-[1.15] font-semibold md:text-[36px]">
          Us, a hotel, or a dharamshala — an honest comparison
        </h2>
        <p className="text-text-muted mt-3 max-w-2xl">
          A dharamshala is the cheapest option and we won&apos;t pretend otherwise. Here&apos;s
          exactly what&apos;s different.
        </p>
        <ComparisonTable rows={PLATFORM_COMPARISON_ROWS} />
      </div>
    </Section>
  );
}
