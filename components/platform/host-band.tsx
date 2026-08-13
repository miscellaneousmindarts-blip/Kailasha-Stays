import { Banknote, LayoutTemplate, MessagesSquare } from "lucide-react";

import { Section } from "@/components/landing/primitives";
import { WhatsAppLink } from "@/components/landing/actions";
import { platformWaLink } from "@/lib/platform-content";

const PROOF_POINTS = [
  { icon: LayoutTemplate, label: "Your own branded booking page" },
  { icon: MessagesSquare, label: "We handle photos, pricing & enquiries" },
  { icon: Banknote, label: "Guests pay you directly" },
];

/**
 * docs/apex-page-plan.md §S11 — `id="for-owners"`, `band="ink"`: the ONLY
 * dark band on this page. Placed after every guest-facing section so it
 * never interrupts the booking flow. Copy is the current apex's own pitch
 * (app/(platform)/page.tsx before this rebuild), relocated rather than
 * rewritten — it was already good.
 *
 * `/list-your-property/` doesn't exist yet (Part B, B2), so the primary CTA
 * points at WhatsApp with an owner-intent prefilled message instead of a
 * page that would 404.
 */
export function HostBand() {
  return (
    <Section id="for-owners" band="ink">
      <p className="text-primary-tint text-xs font-semibold tracking-[0.14em] uppercase">
        Deoghar property owners
      </p>
      <h2 className="font-display mt-3 max-w-2xl text-[26px] leading-[1.15] font-semibold md:text-[34px]">
        Have a flat in Deoghar? Let it earn between visits.
      </h2>
      <p className="mt-5 max-w-2xl text-[17px] leading-[1.6] text-[rgba(253,251,247,0.85)]">
        We list, photograph, price and market your property — and send you guests
        directly, with no commission to a foreign platform. You keep control of your
        calendar and your rates.
      </p>
      <p className="mt-2 max-w-2xl text-[17px] leading-[1.6] text-[rgba(253,251,247,0.85)]">
        We&apos;re onboarding a limited number of homes near Baba Baidyanath Dham.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {PROOF_POINTS.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-2.5">
            <Icon className="text-primary-tint size-5 shrink-0" aria-hidden="true" />
            <span className="text-sm font-medium">{label}</span>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <a
          href={platformWaLink("apex-host-cta", "I have a property in Deoghar I'd like to list.")}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-primary text-primary-foreground hover:bg-primary-hover pressable inline-flex h-12 items-center gap-2 rounded-md px-6 font-medium"
        >
          List your property →
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
          Talk to us on WhatsApp
        </WhatsAppLink>
      </div>
    </Section>
  );
}
