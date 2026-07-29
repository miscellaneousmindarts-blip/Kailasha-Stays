import { landingConfig } from "@/lib/landing-config";

export type FaqItem = {
  q: string;
  /** Plain-text answer — also what goes into the FAQPage structured data. */
  a: string;
  /** Row 4 renders the comparison table beneath its answer. */
  comparison?: true;
};

/**
 * Order matters: the first three are the highest-frequency objections in this
 * market — advance-payment risk, price changing after booking, and whether
 * elderly parents will cope.
 *
 * Built from config so a number never appears in two places and drifts. Any
 * question whose numbers the owner hasn't filled in is dropped rather than
 * rendered with a blank — a FAQ answer reading "about  from the temple" is
 * worse than no answer.
 */
export function buildFaq(opts: {
  sleeps: number | null;
  temple: { label: string; value: string } | null;
}): FaqItem[] {
  const { service, pricing } = landingConfig;
  const items: (FaqItem | null)[] = [
    {
      q: "What if I pay the advance and something goes wrong?",
      a: `Video call first if you want, and free cancellation up to ${service.cancelDays} days before check-in with a full refund. Only ${pricing.advancePct}% upfront, balance on arrival.`,
    },
    {
      q: "Will the price change after I book?",
      a: "No. The rate we send you in writing is the rate you pay. Festival dates cost more and we tell you that upfront.",
    },
    {
      q: "Is it suitable for elderly parents?",
      a: "Ground-floor option available, Western toilet with grab bar, hot water 24×7, car parks at the door. Tell us their needs when booking.",
    },
    {
      q: "How does this compare to a hotel or a dharamshala?",
      a: "A dharamshala is the cheapest option and we won't pretend otherwise. What you get here instead is the whole flat for your family, private bathrooms, a price fixed in writing, and a booking we will not cancel during Shravan.",
      comparison: true,
    },
    opts.temple
      ? {
          q: `How far is it from ${opts.temple.label}?`,
          a: `${opts.temple.value}. We can drop you.`,
        }
      : null,
    {
      q: "Do you arrange airport or station pickup?",
      a: "Yes. The price is fixed and told to you in advance — no haggling with a driver when you arrive.",
    },
    {
      q: "Can we cook our own food?",
      a: "Not a full kitchen — we don't want to promise one we don't have. There is an induction hob for the basics: tea, coffee, warming milk or baby food. Filtered drinking water is provided, and it's a pure vegetarian building. For full meals we can point you to places nearby, or arrange home-cooked food.",
    },
    {
      q: "Can you help arrange pooja at Baidyanath Dham?",
      a: "Yes — plus guidance on Shringar Puja timings and what samagri to carry.",
    },
    {
      q: "Is there 24-hour water and electricity?",
      a: "Yes. Overhead tank plus inverter backup. Both are photographed in the gallery above.",
    },
    opts.sleeps
      ? {
          q: "How many people fit in one 2BHK?",
          a: `Comfortably ${opts.sleeps}. Up to two extra mattresses at no charge.`,
        }
      : null,
    {
      q: "Is a car available for Basukinath and Trikut?",
      a: "Yes, for a full day with driver. The rate is fixed and told to you before you book.",
    },
  ];

  return items.filter((item): item is FaqItem => item !== null);
}

/** Kailasha column is emphasised, but the dharamshala genuinely wins on
 *  price and the table says so — visible fairness converts better with this
 *  buyer than a rigged comparison, and honesty about a weakness is precisely
 *  the differentiator being sold. */
export const COMPARISON_ROWS = [
  { label: "Whole family in one unit", us: "Yes", hotel: "No — 2–3 rooms", dharamshala: "Shared" },
  { label: "Induction hob for tea / baby food", us: "Yes", hotel: "No", dharamshala: "Rarely" },
  { label: "Private bathroom per family", us: "Yes — 2", hotel: "Yes", dharamshala: "Usually shared" },
  { label: "Price fixed in writing beforehand", us: "Yes", hotel: "Varies", dharamshala: "Varies" },
  { label: "Pickup & car arranged", us: "Yes", hotel: "Sometimes", dharamshala: "No" },
  { label: "Pooja assistance", us: "Yes", hotel: "No", dharamshala: "Yes" },
  { label: "Booking honoured in Shravan", us: "Guaranteed", hotel: "Often not", dharamshala: "First-come" },
  { label: "AC, hot water, power backup", us: "Yes", hotel: "Varies", dharamshala: "Rarely" },
  { label: "Cost for 6 people, 3 nights", us: "Mid", hotel: "Highest", dharamshala: "Cheapest" },
] as const;
