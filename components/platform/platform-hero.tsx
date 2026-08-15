import Image from "next/image";
import { Check } from "lucide-react";

import { PhoneLink, WhatsAppLink } from "@/components/landing/actions";
import { BLUR_DATA_URL } from "@/lib/images";
import { platformWaLink, PLATFORM_CONTACT_PHONE } from "@/lib/platform-content";
import type { ResolvedPlatformHero } from "@/lib/platform-sections";

/**
 * docs/apex-page-plan.md §S2. `id="hero"` is load-bearing, not decorative —
 * components/landing/sticky-bar.tsx's IntersectionObserver looks for this
 * exact id to decide when to reveal itself.
 *
 * `content.image` is nullable: no platform-owned hero photograph exists yet
 * (resolveHero() in lib/platform-sections.ts checks the platform_images
 * library, then falls back to a filesystem check via
 * lib/platform-assets.ts). Rather than a broken <Image> or a stock photo, an
 * unphotographed hero renders as a warm gradient with dark text instead of
 * white-on-photo — a real designed state, not a placeholder box, so the page
 * never looks unfinished. The moment a real photo is uploaded or lands at
 * the documented path this flips to the photo treatment automatically.
 */
export function PlatformHero({ content }: { content: ResolvedPlatformHero }) {
  const imageSrc = content.image?.url ?? null;

  return (
    <section id="hero" className="relative isolate">
      {imageSrc ? (
        <>
          <Image
            src={imageSrc}
            alt={content.image?.alt || "A home near Baba Baidyanath Dham, Deoghar"}
            fill
            sizes="100vw"
            priority
            fetchPriority="high"
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
            className="-z-10 object-cover"
          />
          {/* Two stacked gradients, not one — a single bottom-up scrim dark
              enough for the headline swallows the whole photo. Matches
              components/landing/hero.tsx's treatment exactly. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10"
            style={{
              backgroundImage:
                "linear-gradient(to top, rgba(33,26,20,0.88) 0%, rgba(33,26,20,0.30) 68%, rgba(33,26,20,0.10) 100%)," +
                "linear-gradient(to right, rgba(33,26,20,0.65) 0%, rgba(33,26,20,0.10) 68%, rgba(33,26,20,0) 100%)",
            }}
          />
        </>
      ) : (
        <div
          aria-hidden="true"
          className="from-primary-tint via-surface-subtle absolute inset-0 -z-10 bg-gradient-to-br to-background"
        />
      )}

      <div className="container-page flex min-h-[560px] flex-col justify-center py-14 md:min-h-[620px] md:py-24">
        <div className={`max-w-[620px] ${imageSrc ? "text-white" : "text-foreground"}`}>
          <p
            className={`text-xs font-semibold tracking-[0.14em] uppercase ${
              imageSrc ? "text-primary-tint" : "text-primary"
            }`}
          >
            {content.eyebrow}
          </p>

          <h1 className="mt-4">
            <span lang="hi" className="block text-[28px] leading-[1.35] font-normal md:text-[42px]">
              {content.headingHi}
            </span>
            <span className="font-display mt-2 block text-[26px] leading-[1.1] font-semibold md:text-[42px]">
              {content.heading}
            </span>
          </h1>

          <p
            className={`mt-5 max-w-[520px] text-[17px] leading-[1.6] md:text-[19px] ${
              imageSrc ? "text-[rgba(255,255,255,0.88)]" : "text-text-muted"
            }`}
          >
            {content.lede}
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <a
              href="#homes"
              className="bg-primary text-primary-foreground hover:bg-primary-hover pressable inline-flex h-14 items-center gap-2 rounded-full px-7 text-base font-medium"
            >
              <span lang="hi">{content.ctaLabelHi}</span>
              <span className="opacity-85">{`— ${content.ctaLabel}`}</span>
            </a>
            <WhatsAppLink
              href={platformWaLink("hero")}
              context="apex-hero"
              variant="outline"
              // `!` is load-bearing here too — see host-band.tsx's identical
              // fix. Untriggered while imageSrc is null (no hero photo
              // exists yet), but it would render invisible white-on-white
              // text the moment one is added without this.
              className={imageSrc ? "border-white/60! text-white! hover:bg-white/10!" : ""}
            >
              {content.waCtaLabel}
            </WhatsAppLink>
          </div>

          <ul
            className={`mt-6 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:flex sm:flex-wrap sm:items-center sm:gap-x-5 ${
              imageSrc ? "text-[rgba(255,255,255,0.85)]" : "text-text-muted"
            }`}
          >
            {content.trustItems.map((item) => (
              <li key={item} className="flex items-center gap-1.5">
                <Check className="text-primary size-4 shrink-0" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-4">
            <PhoneLink
              phone={PLATFORM_CONTACT_PHONE}
              context="apex-hero"
              className={imageSrc ? "text-white" : ""}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
