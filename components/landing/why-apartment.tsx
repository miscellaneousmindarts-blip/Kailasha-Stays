import { Section } from "@/components/landing/primitives";
import { SavingsCalculator } from "@/components/landing/savings-calculator";

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
}: {
  options: { rate: number; sleeps: number }[];
  currency: string;
  shareSummary: string;
}) {
  return (
    <Section>
      <div className="max-w-2xl">
        <h2 className="font-display text-[26px] leading-[1.15] font-semibold md:text-[36px]">
          Why a 2BHK apartment is better than three hotel rooms
        </h2>
        <p className="text-text-muted mt-4 text-[17px] leading-relaxed md:text-[19px]">
          Six people in a hotel means three rooms, three bills and three sets of
          keys. Here it&apos;s one flat, one price, and nobody sleeping in a
          corridor away from their family. It usually costs less, too. Don&apos;t
          take our word for it — put your own numbers in.
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
