import { Section } from "@/components/landing/primitives";
import { WhatsAppLink } from "@/components/landing/actions";
import { platformWaLink } from "@/lib/platform-content";
import { HOST_BAND_ICONS, type ResolvedPlatformHostBand } from "@/lib/platform-sections";

/**
 * docs/apex-page-plan.md §S11 — `id="for-owners"`, `band="ink"`: the ONLY
 * dark band on this page. Placed after every guest-facing section so it
 * never interrupts the booking flow.
 *
 * `/list-your-property/` doesn't exist yet (Part B, B2), so the primary CTA
 * points at WhatsApp with an owner-intent prefilled message (`ctaWaMessage`)
 * instead of a page that would 404.
 */
export function HostBand({ content }: { content: ResolvedPlatformHostBand }) {
  return (
    <Section id="for-owners" band="ink">
      <p className="text-primary-tint text-xs font-semibold tracking-[0.14em] uppercase">
        {content.eyebrow}
      </p>
      <h2 className="font-display mt-3 max-w-2xl text-[26px] leading-[1.15] font-semibold md:text-[34px]">
        {content.heading}
      </h2>
      {content.bodyParagraphs.map((p, i) => (
        <p
          key={p}
          className={`max-w-2xl text-[17px] leading-[1.6] text-[rgba(253,251,247,0.85)] ${i === 0 ? "mt-5" : "mt-2"}`}
        >
          {p}
        </p>
      ))}

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {content.proofPoints.map(({ icon, label }) => {
          const Icon = HOST_BAND_ICONS[icon];
          return (
            <div key={label} className="flex items-center gap-2.5">
              <Icon className="text-primary-tint size-5 shrink-0" aria-hidden="true" />
              <span className="text-sm font-medium">{label}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <a
          href={platformWaLink("apex-host-cta", content.ctaWaMessage)}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-primary text-primary-foreground hover:bg-primary-hover pressable inline-flex h-12 items-center gap-2 rounded-md px-6 font-medium"
        >
          {content.ctaLabel}
        </a>
        <WhatsAppLink
          href={platformWaLink("apex-host-secondary")}
          context="apex-host-secondary"
          variant="outline"
          // `!` is load-bearing: WhatsAppLink's own text-foreground and this
          // text-background target the same property, and Tailwind resolves
          // that by generated-stylesheet order, not by where the class
          // appears in this string — the base class was winning and
          // rendering black text on this band's black background.
          className="border-white/60! text-background! hover:bg-white/10!"
        >
          {content.secondaryCtaLabel}
        </WhatsAppLink>
      </div>
    </Section>
  );
}
