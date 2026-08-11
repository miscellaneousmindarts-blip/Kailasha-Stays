import { Receipt } from "lucide-react";

import { formatDate, money } from "@/lib/format";
import { groupNightlyRates } from "@/lib/pricing";
import type { GuestBookingBundle } from "@/lib/types/guest-portal";

export function BillingSection({ bundle }: { bundle: GuestBookingBundle }) {
  const { billing } = bundle;

  return (
    <section className="border-border border-t py-6">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
        <Receipt className="text-primary size-5" aria-hidden="true" />
        Billing
      </h2>

      {/* Only when the admin has itemised this booking's price — the same
          breakdown they built, not a re-derived estimate. A booking made
          before itemising existed just shows the plain total below, exactly
          as it always has. */}
      {billing.nightly_rates ? (
        <div className="border-border mb-3 space-y-1.5 rounded-md border p-3 text-sm">
          {groupNightlyRates(billing.nightly_rates).map((g, i) => (
            <div key={i} className="flex items-baseline justify-between gap-3">
              <span className="text-text-muted">
                {money(g.rate)} × {g.nights} {g.nights === 1 ? "night" : "nights"}
              </span>
              <span className="tabular">{money(g.rate * g.nights)}</span>
            </div>
          ))}
          {billing.charges.map((c) => (
            <div key={c.id} className="flex items-baseline justify-between gap-3">
              <span className="text-text-muted">{c.label}</span>
              <span className="tabular">
                {c.kind === "discount" ? "−" : "+"}
                {money(c.amount)}
              </span>
            </div>
          ))}
          <div className="border-border flex items-baseline justify-between gap-3 border-t pt-1.5 font-medium">
            <span>Stay total</span>
            <span className="tabular">{money(billing.base)}</span>
          </div>
        </div>
      ) : null}

      <div className="border-border grid grid-cols-2 gap-3 rounded-md border p-4 sm:grid-cols-4">
        <Stat label="Stay" value={money(billing.base)} />
        <Stat label="Add-ons" value={money(billing.addons_total)} />
        <Stat label="Paid" value={money(billing.paid)} />
        <Stat label="Due" value={money(billing.due)} emphasize={billing.due > 0} />
      </div>

      {billing.payments.length ? (
        <div className="border-border divide-border mt-3 divide-y rounded-md border">
          {billing.payments.map((p, i) => (
            <div key={i} className="flex items-center justify-between p-3 text-sm">
              <span className="text-text-muted">
                {formatDate(p.paid_at)}
                {p.method ? ` · ${p.method}` : ""}
              </span>
              <span className="tabular font-medium">{money(p.amount)}</span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function Stat({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string | null;
  emphasize?: boolean;
}) {
  return (
    <div>
      <p className="text-text-muted text-sm">{label}</p>
      <p className={`tabular font-semibold ${emphasize ? "text-primary" : ""}`}>
        {value ?? "—"}
      </p>
    </div>
  );
}
