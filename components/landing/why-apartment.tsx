import { Section } from "@/components/landing/primitives";
import { SavingsCalculator } from "@/components/landing/savings-calculator";
import type { ResolvedWhyApartment } from "@/lib/homepage";

/**
 * One claim, then the arithmetic. The four feature cards that used to sit here
 * were doing the calculator's job worse — asserting cheapness in prose right
 * above a tool that proves it with the visitor's own numbers. A figure someone
 * generated themselves is far more persuasive than a paragraph telling them
 * what to conclude.
 */
export function WhyApartment({
  options,
  currency,
  shareSummary,
  hotelRoomRate,
  resolved,
}: {
  options: { rate: number; sleeps: number }[];
  currency: string;
  shareSummary: string;
  hotelRoomRate: number;
  resolved: ResolvedWhyApartment;
}) {
  return (
    <Section>
      <div className="max-w-2xl">
        <h2 className="font-display text-[26px] leading-[1.15] font-semibold md:text-[36px]">
          {resolved.heading}
        </h2>
        <p className="text-text-muted mt-4 text-[17px] leading-relaxed md:text-[19px]">
          {resolved.body}
        </p>
      </div>

      {options.length ? (
        <SavingsCalculator
          options={options}
          currency={currency}
          shareSummary={shareSummary}
          hotelRoomRate={hotelRoomRate}
        />
      ) : null}
    </Section>
  );
}
