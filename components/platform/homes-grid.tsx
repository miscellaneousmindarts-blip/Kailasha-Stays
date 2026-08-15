"use client";

import { useState } from "react";

import { PropertyCard, PropertyCardSkeleton } from "@/components/property-card";
import { Eyebrow } from "@/components/landing/primitives";
import type { PlatformProperty } from "@/lib/platform";
import type { ResolvedPlatformHomes } from "@/lib/platform-sections";

const MAX_SHOWN = 9;

type Chip = {
  key: string;
  label: string;
  test: (p: PlatformProperty) => boolean;
};

const CHIP_DEFS: Chip[] = [
  { key: "walk", label: "Walk to temple", test: (p) => p.walkMinutes !== null && p.walkMinutes <= 15 },
  { key: "sleeps6", label: "Sleeps 6+", test: (p) => p.sleeps >= 6 },
  { key: "parking", label: "Free parking", test: (p) => p.amenities.includes("parking") },
  {
    key: "under3000",
    label: "Under ₹3,000",
    test: (p) => p.ratePerNight !== null && p.ratePerNight < 3000,
  },
];

/**
 * docs/apex-page-plan.md §S3b + §S4. `id="homes"` is load-bearing —
 * components/landing/sticky-bar.tsx's IntersectionObserver switches its CTA
 * once this section scrolls past.
 *
 * Filter chips are client-side over the already-fetched list — no route
 * change, no refetch, no /stays/ page needed (that's real date-search,
 * Part B/B3). A chip only renders if at least one property currently
 * matches it; a filter that can only ever return zero is worse than no
 * filter, and this recomputes on every render so a chip that becomes
 * useless (or useful) as properties are added just appears or disappears.
 */
export function HomesGrid({
  properties,
  content,
}: {
  properties: PlatformProperty[];
  content: ResolvedPlatformHomes;
}) {
  const [active, setActive] = useState<Set<string>>(new Set());

  const availableChips = CHIP_DEFS.filter((c) => properties.some(c.test));

  // No useMemo: the React Compiler already memoizes this component, and a
  // hand-rolled memo over a Set spread couldn't be preserved through
  // compilation — this list tops out at a handful of homes, so recomputing
  // on every render costs nothing measurable anyway.
  const filtered =
    active.size === 0
      ? properties
      : properties.filter((p) =>
          [...active].every((key) => CHIP_DEFS.find((c) => c.key === key)?.test(p)),
        );

  const shown = filtered.slice(0, MAX_SHOWN);
  const centreTrack = shown.length < 3;

  function toggle(key: string) {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <section id="homes" className="bg-background py-14 md:py-24">
      <div className="container-page">
        <Eyebrow hi={content.eyebrowHi} en={content.eyebrow} />
        <p className="text-text-muted mt-4 max-w-2xl text-lg leading-relaxed">{content.lede}</p>

        {availableChips.length ? (
          <div className="mt-6 flex flex-wrap gap-2">
            {availableChips.map((chip) => {
              const isActive = active.has(chip.key);
              return (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => toggle(chip.key)}
                  aria-pressed={isActive}
                  className={`pressable flex h-9 items-center rounded-full border px-4 text-sm font-medium transition-colors duration-150 ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:bg-surface-subtle"
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        ) : null}

        {active.size > 0 ? (
          <p className="text-text-muted mt-4 flex items-center gap-3 text-sm">
            Showing {filtered.length} of {properties.length} homes
            <button
              type="button"
              onClick={() => setActive(new Set())}
              className="text-primary hover:underline"
            >
              Clear filters
            </button>
          </p>
        ) : null}

        {shown.length ? (
          <div
            className={`mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 ${
              centreTrack ? "mx-auto max-w-4xl lg:grid-cols-2" : "lg:grid-cols-3"
            }`}
          >
            {shown.map((property, i) => (
              <PropertyCard
                key={property.id}
                property={{
                  id: property.id,
                  slug: property.slug,
                  title: property.title,
                  summary: null,
                  area: null,
                  city: null,
                  max_guests: property.sleeps,
                  bedrooms: property.bedrooms,
                  bathrooms: property.bathrooms,
                  base_price: property.ratePerNight,
                  currency: property.currency,
                  property_type: null,
                  property_images: property.images,
                }}
                href={`/stays/${property.publicSlug}`}
                priority={i === 0}
                distance={property.distanceFromTemple?.value ?? null}
                hostName={property.hostName}
                airbnb={property.airbnb}
              />
            ))}
          </div>
        ) : (
          <div className="border-border mt-8 rounded-lg border border-dashed p-8 text-center">
            <p className="font-medium">No homes match those filters</p>
            <button
              type="button"
              onClick={() => setActive(new Set())}
              className="text-primary mt-1 text-sm hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

export function HomesGridSkeleton() {
  return (
    <section id="homes" className="bg-background py-14 md:py-24">
      <div className="container-page">
        <div className="skeleton h-4 w-40 rounded-sm" />
        <div className="skeleton mt-4 h-7 w-72 rounded-md" />
        <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <PropertyCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
