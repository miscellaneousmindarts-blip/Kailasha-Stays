import { Check, Star } from "lucide-react";

import { landingConfig } from "@/lib/landing-config";
import type { LandingDistance } from "@/lib/landing";

/**
 * Proof before persuasion — social proof above the fold is a top-five CRO
 * lever, so this sits immediately under the hero on every page.
 */
export function TrustRibbon() {
  const { proof, service } = landingConfig;
  const showRating = proof.googleRating !== null && proof.googleCount >= 10;

  return (
    <div className="bg-surface-subtle border-border border-y">
      <ul className="container-page no-scrollbar flex gap-5 overflow-x-auto py-3 text-sm whitespace-nowrap">
        <li className="flex shrink-0 items-center gap-1.5">
          {showRating ? (
            <>
              <Star className="text-warning size-4 fill-current" aria-hidden="true" />
              {proof.googleRating} on Google ({proof.googleCount})
            </>
          ) : proof.familiesHosted ? (
            <>
              <Check className="text-success size-4" aria-hidden="true" />
              {proof.familiesHosted} families hosted
            </>
          ) : (
            <>
              <Check className="text-success size-4" aria-hidden="true" />
              Run by a Deoghar family
            </>
          )}
        </li>
        <li className="flex shrink-0 items-center gap-1.5">
          <Check className="text-success size-4" aria-hidden="true" />
          Identity-verified host
        </li>
        <li className="flex shrink-0 items-center gap-1.5">
          <Check className="text-success size-4" aria-hidden="true" />
          Free cancellation up to {service.cancelDays} days
        </li>
        <li className="flex shrink-0 items-center gap-1.5">
          <Check className="text-success size-4" aria-hidden="true" />
          No hidden charges
        </li>
      </ul>
    </div>
  );
}

/**
 * Distance to landmark is the first specification a pilgrim checks — ahead
 * of decor, amenities and price. Anything the owner hasn't measured yet is
 * omitted rather than guessed.
 */
export function DistanceChips({ distances }: { distances: LandingDistance[] }) {
  if (!distances.length) return null;

  return (
    <div className="bg-background">
      <div className="container-page py-9">
        <ul className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 [scroll-snap-type:x_proximity]">
          {distances.map((chip) => (
            <li
              key={chip.label}
              className="border-border bg-surface flex shrink-0 items-baseline gap-2 rounded-full border px-3.5 py-2 text-sm [scroll-snap-align:start]"
            >
              <span className="font-medium">{chip.label}</span>
              <span className="text-text-muted whitespace-nowrap">{chip.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
