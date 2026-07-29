import { ExternalLink, MapPin } from "lucide-react";

import { landingConfig } from "@/lib/landing-config";
import { serverEnv } from "@/lib/env";
import type { LandingProperty } from "@/lib/landing";

/**
 * Distance to landmark is the first specification a pilgrim checks, so this
 * sits directly under the trust ribbon.
 *
 * A STATIC map image, not an embedded interactive one, for three reasons
 * that all matter more on a phone on mobile data than the interactivity
 * would: the Maps JS library is ~200KB before a single tile and this strip is
 * near the fold; an embedded map captures the finger drag and traps the page
 * scroll; and an <img> can't shift layout. Tapping opens the real Google Maps
 * app, where the guest gets genuinely useful directions — better than
 * anything embeddable.
 *
 * Distances are the owner's own verified numbers from the property's
 * Distances section, not a Distance Matrix call: they're already maintained,
 * they're human-checked, and they cost nothing.
 */

const PROPERTY_PIN = "0xC2410C"; // brand terracotta, matches --primary
const LANDMARK_PIN = "0x4B5563";

function locationOf(property: LandingProperty): string | null {
  if (property.lat !== null && property.lng !== null) {
    return `${property.lat},${property.lng}`;
  }
  const parts = [property.addressLine, property.city].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

/** Static Maps geocodes a plain address, so exact coordinates are optional. */
function pinFor(label: string, city: string | null): string {
  return landingConfig.map.coordinateOverrides[label] ?? [label, city].filter(Boolean).join(", ");
}

function staticMapUrl(
  property: LandingProperty,
  landmarks: { label: string }[],
  key: string,
): string | null {
  const home = locationOf(property);
  if (!home) return null;

  const params = new URLSearchParams({
    // No explicit center/zoom: letting Static Maps auto-fit guarantees every
    // pin is actually in frame, which a guessed zoom cannot.
    size: "640x420",
    scale: "2",
    maptype: "roadmap",
    key,
  });
  params.append("markers", `color:${PROPERTY_PIN}|label:H|${home}`);
  landmarks.forEach((l, i) => {
    params.append(
      "markers",
      `color:${LANDMARK_PIN}|label:${i + 1}|${pinFor(l.label, property.city)}`,
    );
  });

  return `https://maps.googleapis.com/maps/api/staticmap?${params}`;
}

function directionsUrl(property: LandingProperty): string {
  const home = locationOf(property);
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(home ?? property.title)}`;
}

export function MapStrip({ property }: { property: LandingProperty | null }) {
  if (!property) return null;

  const landmarks = property.distances.slice(0, landingConfig.map.maxPins);
  if (!landmarks.length) return null;

  const key = serverEnv.googleMapsStaticKey;
  const mapUrl = key ? staticMapUrl(property, landmarks, key) : null;

  return (
    <div className="bg-background">
      <div className="container-page py-10 md:py-14">
        <div className="grid items-center gap-6 md:grid-cols-2 md:gap-10">
          {mapUrl ? (
            <a
              href={directionsUrl(property)}
              target="_blank"
              rel="noopener noreferrer"
              className="group border-border bg-surface-subtle pressable relative block overflow-hidden rounded-lg border"
              aria-label={`Open ${property.title} in Google Maps`}
            >
              {/* Plain <img>: this is an external, already-optimised PNG, so
                  next/image would proxy it for no benefit. Explicit
                  dimensions keep CLS at zero. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mapUrl}
                alt={`Map showing ${property.title} in ${property.city ?? "Deoghar"} and nearby landmarks`}
                width={640}
                height={420}
                loading="lazy"
                decoding="async"
                className="aspect-[64/42] w-full object-cover"
              />
              <span className="bg-surface/95 text-foreground shadow-card absolute right-3 bottom-3 flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium backdrop-blur-sm">
                Open in Maps
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </span>
            </a>
          ) : null}

          <div>
            <h2 className="font-display text-[22px] leading-[1.15] font-semibold md:text-[28px]">
              Where you&apos;ll be
            </h2>
            <p className="text-text-muted mt-1 text-sm">
              {property.city ? `${property.city}, ` : ""}measured from our door.
            </p>

            <ol className="mt-4 space-y-3">
              {landmarks.map((l, i) => (
                <li key={l.label} className="flex items-start gap-3">
                  {/* Numbers tie each row to its pin — legible at 375px in a
                      way that labels drawn on the map itself never are, and
                      readable by a screen reader, which a map image is not. */}
                  <span
                    aria-hidden="true"
                    className="bg-foreground text-background mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-medium">{l.label}</span>
                    <span className="text-text-muted block text-sm">{l.value}</span>
                  </span>
                </li>
              ))}
            </ol>

            {!mapUrl ? (
              <p className="text-text-muted mt-4 flex items-start gap-2 text-sm">
                <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <a
                  href={directionsUrl(property)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline-offset-2 hover:underline"
                >
                  Open {property.title} in Google Maps
                </a>
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
