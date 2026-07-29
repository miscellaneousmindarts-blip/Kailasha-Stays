import Image from "next/image";
import { ArrowDown, Car, HandHeart, MapPinned } from "lucide-react";

import { landingConfig } from "@/lib/landing-config";
import { money } from "@/lib/format";
import { imageUrl } from "@/lib/images";
import type { LandingData } from "@/lib/landing";

const SERVICE_ICONS = [Car, HandHeart, MapPinned];

/**
 * A strip, not a section. Upsells convert at 15–20% *after* the primary
 * decision but compete with it before, so on the landing page these are
 * context rather than an offer — the real upsell moment is the property page
 * and the WhatsApp thread.
 *
 * Deliberately not linked out yet: each of these wants to be its own ranking
 * URL, and linking to pages that don't exist would just manufacture 404s.
 */
export function ServicesStrip({
  addons,
  currency,
}: {
  addons: LandingData["addons"];
  currency: string;
}) {
  if (!addons.length) return null;

  return (
    <div className="bg-surface-subtle border-border border-y">
      <div className="container-page py-12">
        <ul className="grid gap-4 md:grid-cols-3">
          {addons.slice(0, 3).map((addon, i) => {
            const Icon = SERVICE_ICONS[i] ?? Car;
            return (
              <li
                key={addon.id}
                className="border-border bg-surface flex gap-3 rounded-lg border p-4"
              >
                <Icon className="text-primary mt-0.5 size-5 shrink-0" aria-hidden="true" />
                <div className="min-w-0">
                  <h3 className="font-semibold">{addon.name}</h3>
                  {addon.description ? (
                    <p className="text-text-muted mt-1 text-sm">{addon.description}</p>
                  ) : null}
                  {addon.price !== null ? (
                    <p className="tabular mt-1.5 text-sm font-medium">
                      From {money(addon.price, currency)}
                      {addon.price_unit ? (
                        <span className="text-text-muted font-normal">
                          {" "}
                          {addon.price_unit}
                        </span>
                      ) : null}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
        <p className="text-text-muted mt-4 text-center text-sm">
          All arranged on the same WhatsApp thread as your stay.
        </p>
      </div>
    </div>
  );
}

/**
 * Truthful scarcity only. The availability number is real, carries its own
 * update date, and disappears entirely when the owner hasn't kept it current.
 * No countdown timers, no viewer counts, no invented "1 room left" — in a
 * market defined by dishonesty, faking scarcity would destroy the only asset
 * being built here.
 */
export function ShravanStrip({ year }: { year: number }) {
  const { shravan, pricing, images } = landingConfig;
  const heroSrc = imageUrl(images.hero.path);
  const showPill = shravan.freeUnits !== null && shravan.lastUpdated;

  return (
    <section className="bg-foreground relative isolate overflow-hidden">
      {heroSrc ? (
        <Image
          src={heroSrc}
          alt=""
          aria-hidden="true"
          fill
          sizes="100vw"
          loading="lazy"
          className="-z-10 object-cover opacity-[0.18]"
        />
      ) : null}

      <div className="container-page py-14 md:py-20">
        <p className="text-warning text-xs font-semibold tracking-[0.14em] uppercase">
          Shravan · July–August
        </p>
        <h2 className="text-background mt-3 max-w-2xl font-display text-[26px] leading-[1.15] font-semibold md:text-[36px]">
          Shravani Mela — please book early.
        </h2>
        <div className="mt-4 max-w-[640px] space-y-3 text-[rgba(253,251,247,0.82)]">
          <p>
            Deoghar receives over 40 lakh devotees through Shravan. Our homes
            are usually full months ahead.
          </p>
          <p className="font-medium text-[rgba(253,251,247,0.95)]">
            Reserve with {pricing.advancePct}% advance, pay the balance on
            arrival. Your written confirmation will be honoured. We do not
            cancel on guests, at any price.
          </p>
        </div>

        {showPill ? (
          <p className="border-warning text-background mt-5 inline-block rounded-full border px-4 py-2 text-sm">
            <span className="tabular font-medium">{shravan.freeUnits}</span> homes
            still free for Shravan {year}
            <span className="opacity-70"> · updated {shravan.lastUpdated}</span>
          </p>
        ) : null}

        <div className="mt-6">
          {/* Saffron, not WhatsApp green — green on a dark band looks cheap. */}
          <a
            href="#homes"
            className="bg-primary text-primary-foreground hover:bg-primary-hover pressable inline-flex h-12 items-center gap-2 rounded-md px-6 font-medium"
          >
            See which homes are free
            <ArrowDown className="size-4" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
