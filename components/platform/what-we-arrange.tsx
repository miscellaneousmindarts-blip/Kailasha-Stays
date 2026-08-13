import { Car, CarFront, Flame, UtensilsCrossed } from "lucide-react";

import { Eyebrow, Section } from "@/components/landing/primitives";
import { WHAT_WE_ARRANGE } from "@/lib/platform-content";

const ICONS = { flame: Flame, car: Car, "car-front": CarFront, utensils: UtensilsCrossed } as const;

/** docs/apex-page-plan.md §S8 — the moat section. Specific prices, not a
 *  generic features grid: concrete numbers are the whole point here. */
export function WhatWeArrange() {
  return (
    <Section band="canvas">
      <Eyebrow hi="दर्शन, गाड़ी, पूजा — सब हम देख लेंगे" en="Darshan, car, pooja — we'll handle it" />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 md:gap-6">
        {WHAT_WE_ARRANGE.map((item) => {
          const Icon = ICONS[item.icon];
          return (
            <div key={item.title} className="border-border rounded-xl border p-6">
              <Icon className="text-primary size-6" aria-hidden="true" />
              <p className="font-display mt-3 text-[19px] leading-snug font-semibold">
                {item.title}
              </p>
              <p className="text-text-muted mt-1.5 text-sm leading-relaxed">{item.body}</p>
            </div>
          );
        })}
      </div>

      <p className="text-text-muted mt-6 text-center text-sm">
        All arranged on the same WhatsApp thread as your stay.
      </p>
    </Section>
  );
}
