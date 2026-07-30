import Image from "next/image";
import { ArrowDown } from "lucide-react";

import { ShareButton, PhoneLink, WhatsAppLink } from "@/components/landing/actions";
import { BLUR_DATA_URL } from "@/lib/images";
import type { ResolvedHero } from "@/lib/homepage";

/**
 * Message match between the ad and the headline is a top-five CRO lever, so
 * the H1 and lede swap on `?src=`. Rendered on the server rather than swapped
 * on the client — the H1 is above the fold, and a client-side swap would
 * either flash the wrong copy or push the largest text past first paint.
 *
 * The variant copy itself is resolved server-side in lib/homepage.ts (tokens
 * substituted, empty variants dropped) — this component only picks which
 * already-resolved copy to show.
 */
export type HeroVariant = "brand" | "shravan" | "aiims" | "weekend";

export function isHeroVariant(value: string | undefined): value is HeroVariant {
  return value === "shravan" || value === "aiims" || value === "weekend";
}

export function Hero({
  variant,
  whatsappHref,
  phone,
  shareSummary,
  resolved,
}: {
  variant: HeroVariant;
  whatsappHref: string | null;
  phone: string | null;
  shareSummary: string;
  resolved: ResolvedHero;
}) {
  // Ad traffic keeps its message-matched headline: falling back to the brand
  // copy for a ?src= visitor would break the match the variant exists to
  // create. Falls back to brand copy if that variant was deleted or its
  // tokens didn't resolve — the H1 must never be blank.
  const matched = variant !== "brand" ? resolved.variants.find((v) => v.src === variant) : null;
  const heading = matched?.heading ?? resolved.heading;
  const lede = matched?.lede ?? resolved.lede;

  return (
    <section id="hero" className="relative isolate">
      {resolved.image ? (
        <Image
          src={resolved.image.url}
          alt={resolved.image.alt}
          fill
          sizes="100vw"
          priority
          fetchPriority="high"
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
          className="-z-10 object-cover"
        />
      ) : (
        <div className="bg-surface-subtle absolute inset-0 -z-10" />
      )}

      {/* Flat scrim on mobile, directional on desktop so the right side keeps
          more of the photograph. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[rgba(33,26,20,0.70)] md:bg-[linear-gradient(100deg,rgba(33,26,20,0.80)_0%,rgba(33,26,20,0.55)_45%,rgba(33,26,20,0.22)_100%)]"
      />

      {/* Never force full height on a phone — it pushes the proof row below
          the fold, and the proof row is the whole point of the hero. */}
      <div className="container-page flex flex-col justify-center py-14 md:min-h-[88vh] md:py-24">
        <div className="max-w-[620px]">
          {resolved.eyebrow ? (
            <p className="text-primary-tint text-xs font-semibold tracking-[0.14em] uppercase">
              {resolved.eyebrow}
            </p>
          ) : null}

          <h1 className="mt-4 text-white">
            {resolved.headingHi ? (
              <span lang="hi" className="block text-[28px] leading-[1.35] font-normal md:text-[42px]">
                {resolved.headingHi}
              </span>
            ) : null}
            <span className="font-display mt-2 block text-[26px] leading-[1.1] font-semibold md:text-[42px]">
              {heading}
            </span>
          </h1>

          {lede ? (
            <p className="mt-5 max-w-[520px] text-[17px] leading-[1.6] text-[rgba(255,255,255,0.88)] md:text-[19px]">
              {lede}
            </p>
          ) : null}

          {/* Primary, and deliberately modest — the sticky bar carries the
              placement lift, and a second loud CTA here would split intent. */}
          <a
            href="#homes"
            className="bg-primary text-primary-foreground hover:bg-primary-hover pressable mt-7 inline-flex h-12 items-center gap-2 rounded-md px-6 font-medium"
          >
            {resolved.ctaLabelHi ? <span lang="hi">{resolved.ctaLabelHi}</span> : null}
            <span className="opacity-80">
              {resolved.ctaLabelHi ? "— " : ""}
              {resolved.ctaLabel}
            </span>
            <ArrowDown className="size-4" aria-hidden="true" />
          </a>

          {/* Equal to each other, clearly subordinate to the button above. */}
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-white">
            {whatsappHref ? (
              <WhatsAppLink href={whatsappHref} context="lp-hero" variant="text">
                WhatsApp
              </WhatsAppLink>
            ) : null}
            {phone ? <PhoneLink phone={phone} context="lp-hero" /> : null}
            <ShareButton location="hero" summary={shareSummary} />
          </div>

          {resolved.chips.length ? (
            <ul className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[rgba(255,255,255,0.85)]">
              {resolved.chips.map((chip) => (
                <li key={chip}>{chip}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
}
