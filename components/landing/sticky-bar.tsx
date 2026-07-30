"use client";

import { useEffect, useState } from "react";
import { ArrowDown, MessageCircle, Phone } from "lucide-react";

import { track } from "@/lib/track";

/**
 * The main conversion surface. Testing across 2,000 pages found a
 * sticky-bottom CTA lifts +11% alone versus +6% for above-fold, and only
 * +12% combined — the sticky bar absorbs the benefit, which is why the hero
 * button is deliberately modest.
 *
 * The primary slot smart-switches: it offers "view our homes" until the
 * visitor has actually passed the homes, then becomes WhatsApp. Both labels
 * are always in the DOM, stacked in one grid cell and crossfaded, so the
 * switch can't shift layout.
 */
export function StickyBar({
  whatsappHref,
  phone,
  replyMinutes,
  hoursStart,
  hoursStartHour,
  hoursEndHour,
}: {
  whatsappHref: string;
  phone: string | null;
  replyMinutes: number;
  hoursStart: string;
  hoursStartHour: number;
  hoursEndHour: number;
}) {
  const [visible, setVisible] = useState(false);
  const [pastHomes, setPastHomes] = useState(false);
  // null until mounted: "open now" depends on the device clock, so rendering
  // it on the server would guarantee a hydration mismatch.
  const [isOpen, setIsOpen] = useState<boolean | null>(null);

  useEffect(() => {
    const readClock = () => {
      const hour = new Date().getHours();
      setIsOpen(hour >= hoursStartHour && hour < hoursEndHour);
    };
    readClock();
    const timer = window.setInterval(readClock, 60_000);
    return () => window.clearInterval(timer);
  }, [hoursStartHour, hoursEndHour]);

  useEffect(() => {
    const hero = document.getElementById("hero");
    const homes = document.getElementById("homes");
    if (!hero || !homes) return;

    // Reveal once the hero is behind us; switch once the homes are.
    const heroObserver = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { rootMargin: "-80px 0px 0px 0px" },
    );
    const homesObserver = new IntersectionObserver(
      ([entry]) => {
        const passed =
          !entry.isIntersecting && entry.boundingClientRect.top < 0;
        setPastHomes(passed);
        if (passed) track("sticky_switch");
      },
      { threshold: 0 },
    );

    heroObserver.observe(hero);
    homesObserver.observe(homes);
    return () => {
      heroObserver.disconnect();
      homesObserver.disconnect();
    };
  }, []);

  return (
    <div
      className={`border-border bg-surface shadow-raised fixed inset-x-0 bottom-0 z-40 border-t transition-[opacity,transform] duration-200 lg:hidden ${
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-3 opacity-0"
      }`}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Two rows on a phone, one at sm+. The three-zone row the spec
          describes doesn't survive 375px: the pip and a bilingual CTA label
          together overflow, and truncating either would cost real
          information — the response promise is a conversion element, and the
          Hindi half of the CTA is what makes it feel local. */}
      <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
        {/* Status pip — sub-5-minute response is 21× more likely to qualify a
            lead, so promising it visibly is a conversion element. */}
        <p className="text-text-muted flex min-w-0 shrink items-center gap-1.5 text-xs leading-tight">
          <span
            aria-hidden="true"
            className={`size-2 shrink-0 rounded-full ${isOpen ? "bg-success" : "bg-text-muted"}`}
          />
          <span className="truncate">
            {isOpen === null
              ? null
              : isOpen
                ? `Open · replies in ~${replyMinutes} min`
                : `We reply by ${hoursStart}`}
          </span>
        </p>

        <div className="flex items-center gap-2 sm:contents">
          <a
            href={pastHomes ? whatsappHref : "#homes"}
            target={pastHomes ? "_blank" : undefined}
            rel={pastHomes ? "noopener noreferrer" : undefined}
            onClick={() =>
              pastHomes
                ? track("wa_click", { context: "lp-sticky" })
                : track("property_click", {
                    property: "all",
                    section: "sticky",
                  })
            }
            className={`pressable relative grid flex-1 place-items-center rounded-md text-sm font-medium transition-colors duration-150 ${
              pastHomes
                ? "border-whatsapp text-foreground hover:bg-whatsapp/10 border"
                : "bg-primary text-primary-foreground hover:bg-primary-hover"
            }`}
          >
            {/* Both labels occupy the same cell — crossfade, never reflow. */}
            <span
              className={`col-start-1 row-start-1 flex h-12 items-center gap-1.5 px-3 whitespace-nowrap transition-opacity duration-150 ${
                pastHomes ? "opacity-0" : "opacity-100"
              }`}
              aria-hidden={pastHomes}
            >
              <span lang="hi">घर देखिए</span>
              <span className="opacity-70">— View our homes</span>
              <ArrowDown className="size-4 shrink-0" aria-hidden="true" />
            </span>
            <span
              className={`col-start-1 row-start-1 flex h-12 items-center gap-1.5 px-3 whitespace-nowrap transition-opacity duration-150 ${
                pastHomes ? "opacity-100" : "opacity-0"
              }`}
              aria-hidden={!pastHomes}
            >
              <MessageCircle className="size-4 shrink-0" aria-hidden="true" />
              WhatsApp par poochein
            </span>
          </a>

          {phone ? (
            <a
              href={`tel:${phone}`}
              onClick={() => track("call_click", { context: "lp-sticky" })}
              aria-label={`Call ${phone}`}
              className="border-border bg-surface hover:bg-surface-subtle pressable flex size-12 shrink-0 items-center justify-center rounded-md border"
            >
              <Phone className="size-5" aria-hidden="true" />
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
