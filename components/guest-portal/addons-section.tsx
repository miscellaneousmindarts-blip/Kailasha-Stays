"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { money } from "@/lib/format";
import type { GuestBookingBundle } from "@/lib/types/guest-portal";

const STATUS_LABEL: Record<string, string> = {
  requested: "Requested",
  confirmed: "Confirmed",
  cancelled: "Declined",
};

const STATUS_STYLE: Record<string, string> = {
  requested: "bg-warning/15 text-warning",
  confirmed: "bg-success/15 text-success",
  cancelled: "bg-muted text-text-muted",
};

export function AddonsSection({
  token,
  bundle,
}: {
  token: string;
  bundle: GuestBookingBundle;
}) {
  const [booked, setBooked] = useState(bundle.addons_booked);
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const bookedServiceIds = new Set(
    booked.filter((a) => a.status !== "cancelled").map((a) => a.name),
  );
  const requestable = bundle.addons_available.filter(
    (a) => !bookedServiceIds.has(a.name),
  );

  async function requestAddon(addonId: string, name: string, price: number | null) {
    setRequestingId(addonId);
    setError(null);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("request_addon", {
      p_token: token,
      p_addon_id: addonId,
      p_qty: 1,
    });
    setRequestingId(null);

    if (rpcError) {
      setError("Couldn't send that request — please try again or message us directly.");
      return;
    }
    setBooked((prev) => [
      ...prev,
      { id: `local-${addonId}`, name, price: price ?? 0, qty: 1, status: "requested" },
    ]);
  }

  if (!booked.length && !requestable.length) return null;

  return (
    <section className="border-border border-t py-6">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
        <Sparkles className="text-primary size-5" aria-hidden="true" />
        Add-on services
      </h2>

      {booked.length ? (
        <div className="border-border divide-border divide-y rounded-md border">
          {booked.map((a) => (
            <div key={a.id} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{a.name}</p>
                {a.price ? (
                  <p className="text-text-muted text-sm">
                    {money(a.price)} × {a.qty}
                  </p>
                ) : null}
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[a.status] ?? "bg-muted"}`}
              >
                {STATUS_LABEL[a.status] ?? a.status}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {requestable.length ? (
        <div className="mt-3 space-y-2">
          {requestable.map((a) => (
            <div
              key={a.id}
              className="border-border flex min-h-14 items-center gap-3 rounded-md border p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{a.name}</p>
                {a.description ? (
                  <p className="text-text-muted text-sm">{a.description}</p>
                ) : null}
                {a.price ? (
                  <p className="text-text-muted text-sm">
                    {money(a.price)} {a.price_unit}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => requestAddon(a.id, a.name, a.price)}
                disabled={requestingId === a.id}
                className="border-border hover:bg-surface-subtle pressable flex h-10 shrink-0 items-center gap-1.5 rounded-md border px-3 text-sm font-medium disabled:opacity-60"
              >
                {requestingId === a.id ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                ) : null}
                Request
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-danger mt-2 text-sm">
          {error}
        </p>
      ) : null}
    </section>
  );
}
