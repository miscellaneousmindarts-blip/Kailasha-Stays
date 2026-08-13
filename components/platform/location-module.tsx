import { Car, PlaneTakeoff, TrainFront, Landmark } from "lucide-react";

import { Eyebrow, Section } from "@/components/landing/primitives";
import { LOCATION_RANGES, LOCATION_WALK_MINUTES_FALLBACK } from "@/lib/platform-content";

const ICONS = { landmark: Landmark, train: TrainFront, plane: PlaneTakeoff, car: Car } as const;

/**
 * docs/apex-page-plan.md §S6. Deliberately ranges, not the exact "1.4 km"
 * figures the tenant sites state — those are measured from ONE property's
 * door, and the apex speaks for homes spread across Deoghar, so restating
 * one home's number as if it applied to all of them would be false for most
 * of them. A true range beats a precise-looking number that isn't.
 */
export function LocationModule({ widestWalkMinutes }: { widestWalkMinutes: number | null }) {
  const bound = widestWalkMinutes ?? LOCATION_WALK_MINUTES_FALLBACK;

  return (
    <Section band="canvas">
      <Eyebrow en="Where you'll be" hi="देवघर में आपका ठिकाना" />

      <p className="font-display mx-auto mt-5 max-w-3xl text-center text-[22px] leading-[1.35] font-semibold md:text-[28px]">
        Every home we list is within a{" "}
        <span className="text-primary">{bound}-minute walk</span> of Baba Baidyanath
        Dham — most are far closer.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {LOCATION_RANGES.map((item) => {
          const Icon = ICONS[item.icon];
          return (
            <div key={item.label} className="border-border rounded-xl border p-5">
              <Icon className="text-primary size-5" aria-hidden="true" />
              <p className="font-display mt-3 text-[19px] leading-snug font-semibold">
                {item.label}
              </p>
              <p className="tabular text-primary mt-1 text-[24px] font-semibold">
                {item.range}
              </p>
              <p className="text-text-muted mt-1 text-sm">{item.note}</p>
            </div>
          );
        })}
      </div>

      <p className="text-text-muted mx-auto mt-8 max-w-2xl text-center text-sm">
        Every home&apos;s own page lists its exact distance, measured from that door.
      </p>
    </Section>
  );
}
