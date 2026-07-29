import Image from "next/image";
import { ArrowDown, Star } from "lucide-react";

import { ShareButton, PhoneLink, WhatsAppLink } from "@/components/landing/actions";
import { landingConfig } from "@/lib/landing-config";
import { BLUR_DATA_URL, imageUrl } from "@/lib/images";

/**
 * Message match between the ad and the headline is a top-five CRO lever, so
 * the H1 and lede swap on `?src=`. Rendered on the server rather than
 * swapped on the client — the H1 is above the fold, and a client-side swap
 * would either flash the wrong copy or push the largest text past first
 * paint.
 */
export type HeroVariant = "brand" | "shravan" | "aiims" | "weekend";

export function isHeroVariant(value: string | undefined): value is HeroVariant {
  return value === "shravan" || value === "aiims" || value === "weekend";
}

function heroCopy(variant: HeroVariant, year: number, templeTime: string | null) {
  const temple = templeTime ?? "minutes";

  switch (variant) {
    case "shravan":
      return {
        en: `Shravani Mela ${year} — a clean home for your family, ${temple} from the temple`,
        lede: "Book early. We hold your flat with a small advance and we do not cancel on guests.",
      };
    case "aiims":
      return {
        en: `A full apartment near AIIMS Deoghar — quiet, clean, private`,
        lede: "Weekly and monthly rates for patients and attendants. An induction hob for tea and simple food. Quiet, clean, ground floor available.",
      };
    case "weekend":
      return {
        en: "A whole apartment in Deoghar for your family weekend",
        lede: "Temple, Trikut, Tapovan and Basukinath — car and driver arranged. Fixed prices, no surprises.",
      };
    default:
      return {
        en: `A home of your own in Deoghar — ${temple} from Baba Baidyanath Dham`,
        lede: "Whole apartments for families — the flat is yours alone. Fixed prices, written down. Airport pickup, car and pooja arranged before you arrive.",
      };
  }
}

export function Hero({
  variant,
  whatsappHref,
  phone,
  shareSummary,
  templeTime,
}: {
  variant: HeroVariant;
  whatsappHref: string | null;
  phone: string | null;
  shareSummary: string;
  /** From the property's own Distances section — never a second copy in config. */
  templeTime: string | null;
}) {
  const { images, proof, service } = landingConfig;
  const copy = heroCopy(variant, new Date().getFullYear(), templeTime);
  const src = imageUrl(images.hero.path);
  // Under ten reviews the count itself is the problem — listings below that
  // convert at roughly half the rate of those with 10–20, so we lead with a
  // different proof entirely rather than a weak one.
  const showRating = proof.googleRating !== null && proof.googleCount >= 10;

  return (
    <section id="hero" className="relative isolate">
      {src ? (
        <Image
          src={src}
          alt={images.hero.alt}
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
          <p className="text-primary-tint text-xs font-semibold tracking-[0.14em] uppercase">
            Deoghar · Jharkhand
          </p>

          <h1 className="mt-4 text-white">
            <span lang="hi" className="block text-[28px] leading-[1.35] font-normal md:text-[42px]">
              आपके परिवार के लिए देवघर में एक अपना घर
            </span>
            <span className="mt-2 block text-[24px] leading-[1.15] font-semibold tracking-[-0.02em] md:text-[38px]">
              {copy.en}
            </span>
          </h1>

          <p className="mt-5 max-w-[520px] text-[17px] leading-[1.6] text-[rgba(255,255,255,0.88)] md:text-[19px]">
            {copy.lede}
          </p>

          {/* Primary, and deliberately modest — the sticky bar carries the
              placement lift, and a second loud CTA here would split intent. */}
          <a
            href="#homes"
            className="bg-primary text-primary-foreground hover:bg-primary-hover pressable mt-7 inline-flex h-12 items-center gap-2 rounded-md px-6 font-medium"
          >
            <span lang="hi">घर देखिए</span>
            <span className="opacity-80">— View our homes</span>
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

          <ul className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[rgba(255,255,255,0.85)]">
            {showRating ? (
              <li className="flex items-center gap-1.5">
                <Star className="text-warning size-4 fill-current" aria-hidden="true" />
                {proof.googleRating} ({proof.googleCount} Google reviews)
              </li>
            ) : proof.familiesHosted ? (
              <li>{proof.familiesHosted} families hosted</li>
            ) : null}
            <li>Verified host</li>
            <li>Free cancellation</li>
            <li>Replies in ~{service.replyMinutes} min</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
