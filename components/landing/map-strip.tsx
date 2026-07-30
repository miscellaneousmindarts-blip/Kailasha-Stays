import Image from "next/image";
import { ExternalLink, MapPin } from "lucide-react";

import { landingConfig } from "@/lib/landing-config";
import { serverEnv } from "@/lib/env";
import { BLUR_DATA_URL, imageUrl } from "@/lib/images";
import type { LandingProperty } from "@/lib/landing";
import type { ResolvedMap } from "@/lib/homepage";

/**
 * Distance to landmark is the first specification a pilgrim checks, so this
 * sits directly under the trust ribbon.
 *
 * Laid out as a bento: one large anchor tile carrying the map and the heading,
 * then the landmarks as their own tiles. The asymmetry is doing real work — the
 * first landmark is the temple, which is the entire reason the family is
 * searching, so it gets the wide tile and reads first. The remaining two
 * recede.
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
    size: "640x640",
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

/**
 * "1.4 km — 15 min walk" becomes a big figure and a quiet qualifier. Splits on
 * dashes only, never on spaces: "15 min walk" has to survive intact when the
 * owner wrote no distance at all.
 */
function splitValue(value: string): { figure: string; mode: string | null } {
  const parts = value
    .split(/\s*[—–]\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
  return { figure: parts[0] ?? value, mode: parts[1] ?? null };
}

export function MapStrip({
  property,
  resolved,
}: {
  property: LandingProperty | null;
  resolved: ResolvedMap;
}) {
  if (!property) return null;

  const landmarks = property.distances.slice(0, landingConfig.map.maxPins);
  if (!landmarks.length) return null;

  const key = serverEnv.googleMapsStaticKey;
  const mapUrl = key ? staticMapUrl(property, landmarks, key) : null;
  // Without a Maps key the anchor tile still needs to be a place, not a grey
  // box — the home's own cover photo is honest and costs nothing extra, since
  // the Homes section already loads this exact URL.
  const fallbackSrc = mapUrl ? null : imageUrl(property.images[0]?.storage_path ?? null);
  const href = directionsUrl(property);

  // Only the full three-landmark set fills a 4×2 bento; fewer collapse to a
  // single row rather than leaving a hole where a tile should be.
  const full = landmarks.length >= 3;

  return (
    <div className="bg-background">
      <div className="container-page py-10 md:py-14">
        <div
          className={`grid grid-cols-2 gap-3 md:grid-cols-4 ${full ? "md:grid-rows-2" : ""}`}
        >
          {/* Anchor tile. The heading lives in the overlay so the map reads as
              the section rather than as an illustration beside it. */}
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={`group border-border bg-foreground pressable relative col-span-2 block aspect-[4/3] overflow-hidden rounded-xl border sm:aspect-[16/10] md:aspect-auto md:min-h-[340px] ${full ? "md:row-span-2" : ""}`}
            aria-label={`Open ${property.title} in Google Maps`}
          >
            {mapUrl ? (
              <>
                {/* Plain <img>: an external, already-optimised PNG, so
                    next/image would proxy it for no benefit. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mapUrl}
                  alt={`Map showing ${property.title} in ${property.city ?? "Deoghar"} and nearby landmarks`}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 size-full object-cover"
                />
              </>
            ) : fallbackSrc ? (
              <Image
                src={fallbackSrc}
                alt={property.images[0]?.alt ?? property.title}
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                loading="lazy"
                placeholder="blur"
                blurDataURL={BLUR_DATA_URL}
                className="object-cover"
              />
            ) : null}

            {/* Weighted to the bottom so the map's own detail stays readable
                through the top two-thirds. */}
            <span
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 block h-3/5 bg-[linear-gradient(to_top,rgba(33,26,20,0.94)_0%,rgba(33,26,20,0.72)_38%,rgba(33,26,20,0)_100%)]"
            />

            <div className="absolute inset-x-0 bottom-0 p-5 md:p-6">
              <h2 className="font-display text-[26px] leading-[1.1] font-semibold text-white md:text-[34px]">
                {resolved.heading}
              </h2>
              {resolved.sub ? (
                <p className="mt-1.5 text-sm text-[rgba(255,255,255,0.82)]">
                  {property.city ? `${property.city} · ` : ""}
                  {resolved.sub}
                </p>
              ) : null}
            </div>

            <span className="bg-surface/95 text-foreground shadow-card absolute top-4 right-4 flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium backdrop-blur-sm">
              {mapUrl ? (
                <ExternalLink className="size-3.5" aria-hidden="true" />
              ) : (
                <MapPin className="size-3.5" aria-hidden="true" />
              )}
              Open in Maps
            </span>
          </a>

          {landmarks.map((l, i) => {
            const { figure, mode } = splitValue(l.value);
            // The first landmark is the temple. It carries the decision, so it
            // gets the wide tile rather than being the third identical card.
            const lead = i === 0;
            const photo = resolved.landmarkImages[i] ?? null;

            // With a photo the tile becomes image + scrim + white type. Without
            // one it stays typographic, and the lead tile inverts so the grid
            // still has a focal point.
            const onDark = Boolean(photo) || lead;

            return (
              <div
                key={l.label}
                className={`relative isolate flex min-h-[136px] flex-col justify-end overflow-hidden rounded-xl border p-4 md:min-h-[158px] md:p-5 ${
                  photo?.isPlaceholder ? "pt-11 md:pt-12" : ""
                } ${
                  onDark
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-surface-subtle"
                } ${full && lead ? "col-span-2" : ""}`}
              >
                {photo ? (
                  <>
                    <Image
                      src={photo.url}
                      alt={photo.alt}
                      fill
                      sizes={
                        full && lead
                          ? "(min-width: 768px) 50vw, 100vw"
                          : "(min-width: 768px) 25vw, 50vw"
                      }
                      loading="lazy"
                      placeholder="blur"
                      blurDataURL={BLUR_DATA_URL}
                      className="-z-10 object-cover"
                    />
                    {/* Two layers, not one. These tiles are far wider than they
                        are tall, so a single bottom-up scrim dark enough for the
                        figure swallows the whole photograph. Stacking a vertical
                        and a horizontal gradient puts the darkness in the
                        bottom-left corner where the type sits and leaves the
                        top-right actually showing the place. */}
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 -z-10 block"
                      style={{
                        backgroundImage:
                          "linear-gradient(to top, rgba(33,26,20,0.88) 0%, rgba(33,26,20,0.30) 68%, rgba(33,26,20,0.10) 100%)," +
                          "linear-gradient(to right, rgba(33,26,20,0.72) 0%, rgba(33,26,20,0.12) 68%, rgba(33,26,20,0) 100%)",
                      }}
                    />
                    {/* These tiles name real, identifiable places, so an
                        unreplaced sample has to say so out loud. */}
                    {photo.isPlaceholder ? (
                      <span className="bg-warning/95 text-warning-foreground absolute top-2 left-2 rounded-full px-2 py-0.5 text-[11px] font-medium">
                        Sample photo
                      </span>
                    ) : null}
                  </>
                ) : null}

                {/* Ties the tile to its numbered pin on the map, and gives a
                    photo-less tile some depth. */}
                <span
                  aria-hidden="true"
                  className={`font-display pointer-events-none absolute -top-3 right-2 text-[86px] leading-none font-semibold md:text-[104px] ${
                    photo
                      ? "text-white/[0.16]"
                      : lead
                        ? "text-white/[0.10]"
                        : "text-foreground/[0.07]"
                  }`}
                >
                  {i + 1}
                </span>

                <h3
                  className={`relative text-[15px] leading-snug font-medium ${onDark ? "" : "text-foreground"}`}
                >
                  {l.label}
                </h3>
                <p
                  className={`font-display tabular relative mt-1 text-[24px] leading-none font-semibold md:text-[30px] ${
                    onDark ? "text-primary-tint" : "text-foreground"
                  }`}
                >
                  {figure}
                </p>
                {mode ? (
                  <p
                    className={`relative mt-1.5 text-sm ${onDark ? "text-[rgba(253,251,247,0.78)]" : "text-text-muted"}`}
                  >
                    {mode}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
