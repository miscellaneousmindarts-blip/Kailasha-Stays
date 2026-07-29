import { Section } from "@/components/landing/primitives";
import { SavingsCalculator } from "@/components/landing/savings-calculator";

/**
 * These four map one-to-one onto the strongest fears in this market: food
 * purity, elders' comfort, women's safety, and cost guilt.
 *
 * Deliberately NOT icon-in-a-tinted-rounded-square cards. That component —
 * a Lucide glyph in a soft tinted square above a bold title above three lines
 * of grey — is the single most recognisable template pattern on the web, and
 * it makes a page look generated no matter how good the writing is. A serif
 * numeral and a hairline carry the same structure without the stock smell.
 */
const REASONS = [
  {
    title: "Induction for the basics",
    body: "An induction hob for tea, coffee and baby food. Not a full kitchen, and we won't pretend otherwise. Pure vegetarian building, so no onion-garlic worries during Shravan.",
  },
  {
    title: "Comfortable for elders",
    body: "Ground-floor option. Western toilet with a grab bar. Hot water 24×7. No long corridors. The car parks at your door.",
  },
  {
    title: "One private home, one key",
    body: "Not a corridor of strangers. The whole flat is yours. Verified host, CCTV at the entrance, safe for the women travelling with you.",
  },
  {
    title: "Cheaper than three rooms",
    body: "One home instead of a corridor of them. Work out your exact saving below.",
  },
];

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
      <h2 className="font-display max-w-2xl text-[26px] leading-[1.15] font-semibold md:text-[36px]">
        Why families choose one apartment over three hotel rooms
      </h2>

      <div className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2">
        {REASONS.map(({ title, body }, i) => (
          <div key={title} className="border-border border-t pt-5">
            <div className="flex items-baseline gap-3">
              <span
                aria-hidden="true"
                className="font-display text-text-muted/50 text-lg leading-none"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="font-semibold">{title}</h3>
            </div>
            <p className="text-text-muted mt-2 pl-8 leading-relaxed">{body}</p>
          </div>
        ))}
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
