"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { amenity } from "@/lib/amenities";
import { money } from "@/lib/format";
import { BLUR_DATA_URL, imageUrl } from "@/lib/images";
import { track } from "@/lib/track";
import type { LandingProperty } from "@/lib/landing";

/** Amenities that answer the actual fears — cooking, elders, power, water. */
const HEADLINE_AMENITIES = [
  "air_conditioning",
  "hot_water",
  "power_backup",
  "parking",
  "wifi",
];

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="border-border bg-background rounded-full border px-2.5 py-1 text-xs font-medium">
      {children}
    </span>
  );
}

/**
 * The landing page's primary conversion surface. Exactly one action — no
 * WhatsApp button here: the card's whole job is to get a low-commitment
 * click through to the property page, where WhatsApp becomes primary.
 */
export function LandingPropertyCard({
  property,
  section,
  compact = false,
}: {
  property: LandingProperty;
  /** Which part of the page this card sits in — shows up in `property_click`. */
  section: string;
  /** The close-section repeat: one image, tighter. Reuses the same image
   *  urls as the Homes section, so it costs no extra requests. */
  compact?: boolean;
}) {
  const [lead, ...rest] = property.images;
  const thumbs = rest.slice(0, 2);
  const amenityLine = HEADLINE_AMENITIES.map((key) => amenity(key)?.label)
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={`/properties/${property.slug}`}
      onClick={() => track("property_click", { property: property.slug, section })}
      className="group border-border bg-surface hover:border-input flex flex-col rounded-lg border p-3 transition-[transform,border-color] duration-150 hover:-translate-y-0.5 focus-visible:-translate-y-0.5"
    >
      {lead ? (
        <div className={`flex gap-1 ${compact ? "" : "sm:gap-1"}`}>
          <div
            className={`bg-surface-subtle relative overflow-hidden rounded-md ${
              compact ? "aspect-[16/9] w-full" : thumbs.length ? "aspect-[4/3] flex-[2]" : "aspect-[4/3] w-full"
            }`}
          >
            <Image
              src={imageUrl(lead.storage_path) ?? ""}
              alt={lead.alt ?? property.title}
              fill
              sizes="(max-width: 768px) 100vw, 380px"
              loading="lazy"
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
              className="object-cover"
            />
          </div>

          {!compact && thumbs.length ? (
            <div className="flex flex-1 flex-col gap-1">
              {thumbs.map((img, i) => (
                <div
                  key={i}
                  className="bg-surface-subtle relative flex-1 overflow-hidden rounded-md"
                >
                  <Image
                    src={imageUrl(img.storage_path) ?? ""}
                    alt={img.alt ?? ""}
                    fill
                    sizes="180px"
                    loading="lazy"
                    placeholder="blur"
                    blurDataURL={BLUR_DATA_URL}
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-1 flex-col px-1 pt-3">
        <h3 className="text-lg font-semibold">{property.title}</h3>

        {!compact ? (
          <>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Chip>Sleeps {property.sleeps}</Chip>
              {property.distanceFromTemple ? (
                <Chip>{property.distanceFromTemple} from temple</Chip>
              ) : null}
              {property.floor ? <Chip>{property.floor}</Chip> : null}
              <Chip>
                {property.bathrooms} bathroom{property.bathrooms === 1 ? "" : "s"}
              </Chip>
            </div>
            <p className="text-text-muted mt-2 text-sm">{amenityLine}</p>
          </>
        ) : null}

        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <p className="tabular">
            {property.ratePerNight !== null ? (
              <>
                <span className="text-text-muted text-sm">From </span>
                <span className="text-xl font-semibold">
                  {money(property.ratePerNight, property.currency)}
                </span>
                <span className="text-text-muted text-sm"> / night</span>
              </>
            ) : (
              <span className="text-text-muted text-sm">Ask us for the rate</span>
            )}
          </p>
          <span className="bg-primary text-primary-foreground group-hover:bg-primary-hover pressable flex h-11 shrink-0 items-center gap-1.5 rounded-md px-4 text-sm font-medium">
            See this home
            <ArrowRight className="size-4" aria-hidden="true" />
          </span>
        </div>
      </div>
    </Link>
  );
}
