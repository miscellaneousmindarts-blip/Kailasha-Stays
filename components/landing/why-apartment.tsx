import { Section } from "@/components/landing/primitives";
import { SavingsCalculator } from "@/components/landing/savings-calculator";
import type { Copy } from "@/lib/homepage";

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
  copy,
}: {
  options: { rate: number; sleeps: number }[];
  currency: string;
  shareSummary: string;
  copy: Copy;
}) {
  return (
    <Section>
      <div className="max-w-2xl">
        <h2 className="font-display text-[26px] leading-[1.15] font-semibold md:text-[36px]">
          {copy("heading")}
        </h2>
        <p className="text-text-muted mt-4 text-[17px] leading-relaxed md:text-[19px]">
          {copy("body")}
        </p>
      </div>

      {options.length ? (
        <SavingsCalculator
          options={options}
          currency={currency}
          shareSummary={shareSummary}
        />
      ) : null}
    </Section>
  );
}
