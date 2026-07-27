"use client";

import { useState } from "react";
import { Check, Copy, KeyRound, Wifi } from "lucide-react";

import type { GuestBookingBundle } from "@/lib/types/guest-portal";

function CopyChip({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      }}
      className="border-border hover:bg-surface-subtle pressable flex min-h-14 w-full items-center justify-between gap-3 rounded-md border px-4 py-3 text-left"
    >
      <span className="min-w-0">
        <span className="text-text-muted block text-xs">{label}</span>
        <span className="tabular block truncate font-medium">{value}</span>
      </span>
      {copied ? (
        <Check className="text-success size-5 shrink-0" aria-hidden="true" />
      ) : (
        <Copy className="text-text-muted size-5 shrink-0" aria-hidden="true" />
      )}
    </button>
  );
}

export function WifiSection({ bundle }: { bundle: GuestBookingBundle }) {
  const { private: priv } = bundle;
  if (!priv?.wifi_name && !priv?.door_code) return null;

  return (
    <section className="border-border border-t py-6">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
        <Wifi className="text-primary size-5" aria-hidden="true" />
        Wifi &amp; access
      </h2>
      <div className="space-y-2">
        {priv.wifi_name ? <CopyChip label="Wifi network" value={priv.wifi_name} /> : null}
        {priv.wifi_password ? (
          <CopyChip label="Wifi password" value={priv.wifi_password} />
        ) : null}
        {priv.door_code ? (
          <div className="border-border flex min-h-14 items-center gap-3 rounded-md border px-4 py-3">
            <KeyRound className="text-text-muted size-5 shrink-0" aria-hidden="true" />
            <span className="min-w-0">
              <span className="text-text-muted block text-xs">Door code</span>
              <span className="tabular block font-medium">{priv.door_code}</span>
            </span>
          </div>
        ) : null}
      </div>
      {priv.other_notes ? (
        <p className="text-text-muted mt-3 text-sm whitespace-pre-line">{priv.other_notes}</p>
      ) : null}
    </section>
  );
}
