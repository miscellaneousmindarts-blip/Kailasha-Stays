import { CookingPot, Lock, UsersRound, Wallet } from "lucide-react";

import { Eyebrow, Section } from "@/components/landing/primitives";
import { SavingsCalculator } from "@/components/landing/savings-calculator";

/**
 * These four map one-to-one onto the strongest fears in this market: food
 * purity, elders' comfort, women's safety, and cost guilt. Anything that
 * doesn't remove a specific fear doesn't belong on the page.
 */
const REASONS = [
  {
    icon: CookingPot,
    title: "Your own kitchen",
    body: "Cook satvik food the way your family eats. Pure vegetarian building — no onion-garlic worries during Shravan. Gas, utensils and filtered water provided.",
  },
  {
    icon: UsersRound,
    title: "Comfortable for elders",
    body: "Ground-floor option. Western toilet with a grab bar. Hot water 24×7. No long corridors. The car parks at your door.",
  },
  {
    icon: Lock,
    title: "One private home, one key",
    body: "Not a corridor of strangers. The whole flat is yours. Verified host, CCTV at the entrance — safe for the women travelling with you.",
  },
  {
    icon: Wallet,
    title: "Cheaper than three rooms",
    body: "Work out your exact saving below.",
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
      <Eyebrow en="Why families choose us" />
      <h2 className="mt-3 max-w-2xl text-[23px] font-semibold tracking-[-0.015em] md:text-[32px]">
        Why families choose one apartment over three hotel rooms
      </h2>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {REASONS.map(({ icon: Icon, title, body }) => (
          <div key={title}>
            <span className="bg-primary-tint text-primary flex size-11 items-center justify-center rounded-md">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <h3 className="mt-3 font-semibold">{title}</h3>
            <p className="text-text-muted mt-1.5 text-sm leading-relaxed">{body}</p>
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
