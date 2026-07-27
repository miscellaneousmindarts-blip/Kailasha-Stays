import { Clock, ExternalLink, MapPin, Route } from "lucide-react";

import type { GuestBookingBundle } from "@/lib/types/guest-portal";

export function GettingThereSection({ bundle }: { bundle: GuestBookingBundle }) {
  const { private: priv, property } = bundle;
  if (!priv?.exact_address && !property) return null;

  return (
    <section className="border-border border-t py-6">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
        <MapPin className="text-primary size-5" aria-hidden="true" />
        Getting there
      </h2>

      {priv?.exact_address ? (
        <p className="whitespace-pre-line">{priv.exact_address}</p>
      ) : null}

      {priv?.exact_gmaps_url ? (
        <a
          href={priv.exact_gmaps_url}
          target="_blank"
          rel="noopener noreferrer"
          className="border-border hover:bg-surface-subtle pressable mt-3 flex h-11 items-center justify-center gap-2 rounded-md border font-medium"
        >
          Open in Google Maps
          <ExternalLink className="size-4" aria-hidden="true" />
        </a>
      ) : null}

      {priv?.directions_note ? (
        <p className="text-text-muted mt-3 flex items-start gap-2 text-sm">
          <Route className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {priv.directions_note}
        </p>
      ) : null}

      {property?.check_in_time || property?.check_out_time ? (
        <p className="text-text-muted mt-3 flex items-center gap-2 text-sm">
          <Clock className="size-4 shrink-0" aria-hidden="true" />
          Check-in from {property.check_in_time}, check-out by{" "}
          {property.check_out_time}
        </p>
      ) : null}
    </section>
  );
}
