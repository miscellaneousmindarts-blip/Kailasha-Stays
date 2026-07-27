"use client";

import { money } from "@/lib/format";
import type { Quote } from "@/lib/pricing";

/**
 * Per-night detail behind a direct total. Collapses repeated nights at the
 * same rate into one "₹3,200 × 4 nights" line, and only itemises when a rate
 * period actually makes nights differ — so a flat stay stays a single line
 * instead of a wall of identical rows.
 */
export function PriceBreakdown({
  quote,
  currency,
}: {
  quote: Quote;
  currency: string;
}) {
  if (quote.direct.total === null) return null;

  const groups: { rate: number; nights: number; label: string | null }[] = [];
  for (const night of quote.nightly) {
    if (night.direct === null) continue;
    const last = groups.at(-1);
    if (last && last.rate === night.direct && last.label === night.label) {
      last.nights += 1;
    } else {
      groups.push({ rate: night.direct, nights: 1, label: night.label });
    }
  }

  return (
    <div className="border-border space-y-2 border-t pt-4 text-sm">
      {groups.map((g, i) => (
        <div key={i} className="flex items-baseline justify-between gap-3">
          <span className="text-text-muted">
            {money(g.rate, currency)} × {g.nights}{" "}
            {g.nights === 1 ? "night" : "nights"}
            {g.label ? (
              <span className="text-text-muted"> · {g.label}</span>
            ) : null}
          </span>
          <span className="tabular shrink-0">
            {money(g.rate * g.nights, currency)}
          </span>
        </div>
      ))}
      <div className="border-border flex items-baseline justify-between gap-3 border-t pt-2 font-medium">
        <span>Total</span>
        <span className="tabular">{money(quote.direct.total, currency)}</span>
      </div>
    </div>
  );
}
