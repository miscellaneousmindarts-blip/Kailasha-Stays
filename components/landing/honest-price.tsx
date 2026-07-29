import { ArrowDown, Check, ShieldCheck } from "lucide-react";

import { Eyebrow, Section } from "@/components/landing/primitives";
import { landingConfig } from "@/lib/landing-config";
import { money } from "@/lib/format";
import type { LandingData, LandingProperty } from "@/lib/landing";

const INCLUDED = [
  "Electricity",
  "Water",
  "Wifi",
  "Parking",
  "Daily cleaning",
  "Induction hob",
];

/**
 * Sits before the gallery, deliberately. Advance-payment fear is the specific
 * form risk takes in this market — the documented failures of competing
 * Deoghar properties are wrong bills, denied confirmed bookings and transport
 * overcharging — so the money question gets answered before the photographs
 * try to charm anyone.
 *
 * No image here. Restraint is the point.
 */
export function HonestPrice({
  properties,
  currency,
  addons,
}: {
  properties: LandingProperty[];
  currency: string;
  addons: LandingData["addons"];
}) {
  const { service, pricing } = landingConfig;

  // The headline rate and the sentence under it must describe the SAME home.
  // Quoting the cheapest rate beside a description of the biggest flat is
  // exactly the kind of wrong-bill impression this section exists to prevent.
  const priced = properties.filter((p) => p.ratePerNight !== null);
  const cheapest = priced.length
    ? priced.reduce((a, b) => ((a.ratePerNight ?? 0) <= (b.ratePerNight ?? 0) ? a : b))
    : null;
  const ratePerNight = cheapest?.ratePerNight ?? null;
  const capacities = priced.map((p) => p.sleeps);
  const capacityLabel = capacities.length
    ? Math.min(...capacities) === Math.max(...capacities)
      ? `up to ${capacities[0]} guests`
      : `homes sleeping ${Math.min(...capacities)}–${Math.max(...capacities)} guests`
    : null;

  return (
    <Section band="sand">
      <div className="border-border bg-surface shadow-card mx-auto max-w-[760px] rounded-lg border p-6 md:p-8">
        <Eyebrow hi="साफ़ और सीधी बात" en="Plain and honest" />
        <h2 className="mt-3 text-[23px] font-semibold tracking-[-0.015em] md:text-[32px]">
          What you pay. All of it.
        </h2>

        <div className="mt-6 grid gap-8 md:grid-cols-2 md:gap-10">
          <div>
            {ratePerNight !== null ? (
              <p className="tabular">
                <span className="text-text-muted text-sm">From </span>
                <span className="text-[34px] leading-[1.1] font-semibold tracking-[-0.02em] md:text-[44px]">
                  {money(ratePerNight, currency)}
                </span>
                <span className="text-text-muted block text-sm">
                  per night{capacityLabel ? ` · ${capacityLabel}` : ""}
                </span>
              </p>
            ) : null}

            <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
              {INCLUDED.map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <Check className="text-primary size-4 shrink-0" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-text-muted mt-3 text-sm">
              Taxes stated clearly on your booking message, before you pay.
            </p>

            <div className="bg-primary-tint mt-5 rounded-md p-4 text-sm">
              <p className="font-semibold">We do not charge extra for:</p>
              <p className="mt-1">
                Extra mattress (up to 2) · early check-in when the flat is free ·
                luggage storage · drinking water
              </p>
            </div>

            <p className="mt-5 text-sm leading-relaxed">
              Festival dates cost more — that&apos;s honest.{" "}
              <span className="text-primary font-medium">
                We tell you the exact rate before you pay a single rupee, and it
                never changes after.
              </span>
            </p>
          </div>

          <div className="md:border-border md:border-l md:pl-10">
            <div className="border-success/30 bg-success/5 rounded-md border p-4">
              <h3 className="flex items-center gap-2 font-semibold">
                <ShieldCheck className="text-success size-5 shrink-0" aria-hidden="true" />
                <span lang="hi">आपका पैसा सुरक्षित है</span>
              </h3>
              <p className="text-text-muted mt-0.5 text-sm">Your money is safe</p>
              <ul className="mt-3 space-y-2.5 text-sm">
                <li className="flex gap-2">
                  <Check className="text-success mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span>
                    <strong className="font-medium">
                      See the flat on a video call before you pay anything.
                    </strong>{" "}
                    Ask and we&apos;ll walk you through it live on WhatsApp.
                  </span>
                </li>
                <li className="flex gap-2">
                  <Check className="text-success mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span>
                    <strong className="font-medium">
                      Free cancellation up to {service.cancelDays} days before
                      check-in
                    </strong>{" "}
                    — full refund of your advance, no questions.
                  </span>
                </li>
                <li className="flex gap-2">
                  <Check className="text-success mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span>
                    <strong className="font-medium">
                      Only {pricing.advancePct}% advance
                    </strong>{" "}
                    to hold the flat. Balance when you arrive.
                  </span>
                </li>
                <li className="flex gap-2">
                  <Check className="text-success mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span>
                    <strong className="font-medium">
                      We never cancel a confirmed booking.
                    </strong>{" "}
                    Not even during Shravan, not for a higher offer.
                  </span>
                </li>
              </ul>
            </div>

            {addons.length ? (
              <dl className="mt-5 space-y-1.5 text-sm">
                {addons.slice(0, 3).map((a) => (
                  <div key={a.id} className="flex justify-between gap-3">
                    <dt className="text-text-muted">{a.name}</dt>
                    <dd className="tabular font-medium">
                      {a.price !== null ? money(a.price, currency) : "Ask us"}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        </div>
      </div>

      <p className="text-text-muted mt-6 flex flex-wrap items-center justify-center gap-3 text-center text-sm">
        Each home has its own price and photos.
        <a
          href="#homes"
          className="bg-primary text-primary-foreground hover:bg-primary-hover pressable inline-flex h-11 items-center gap-2 rounded-md px-5 font-medium"
        >
          See the homes
          <ArrowDown className="size-4" aria-hidden="true" />
        </a>
      </p>
    </Section>
  );
}
