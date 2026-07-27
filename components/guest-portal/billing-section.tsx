import { Receipt } from "lucide-react";

import { formatDate, money } from "@/lib/format";
import type { GuestBookingBundle } from "@/lib/types/guest-portal";

export function BillingSection({ bundle }: { bundle: GuestBookingBundle }) {
  const { billing } = bundle;

  return (
    <section className="border-border border-t py-6">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
        <Receipt className="text-primary size-5" aria-hidden="true" />
        Billing
      </h2>

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
