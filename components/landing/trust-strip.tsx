import { Check, Star } from "lucide-react";

import { landingConfig } from "@/lib/landing-config";

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

