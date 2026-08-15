"use client";

import { ChevronDown } from "lucide-react";

import { Section } from "@/components/landing/primitives";
import { WhatsAppLink } from "@/components/landing/actions";
import { track } from "@/lib/track";
import { platformWaLink } from "@/lib/platform-content";
import type { ResolvedPlatformFaq } from "@/lib/platform-sections";

/**
 * docs/apex-page-plan.md §S12. Same native-<details> pattern as
 * components/landing/faq.tsx (multiple rows open for free, no ARIA of our
 * own to get wrong), rebuilt against the platform's own static content
 * instead of the tenant homepage builder's ResolvedFaq. Answers are in the
 * DOM at load — not injected on click — so crawlers and AI assistants can
 * read them, which is the entire point of putting FAQPage schema on this
 * section (app/(platform)/page.tsx).
 *
 * Unlike the tenant FAQ, the "how does this compare" answer here is text
 * only — the full comparison table already has its own standalone section
 * (§S7, rendered separately in page.tsx), so embedding it a second time
 * inside this accordion item would just repeat it on the same page.
 *
 * `content` is null when zero FAQ items survive resolution (no items with
 * both a question and an answer) — see resolveFaq() in
 * lib/platform-sections.ts. A heading over an empty accordion is worse than
 * no section at all.
 */
export function PlatformFaq({ content }: { content: ResolvedPlatformFaq | null }) {
  if (!content) return null;

  return (
    <Section band="canvas">
      <div className="mx-auto max-w-[760px]">
        <h2 className="font-display text-[26px] leading-[1.15] font-semibold md:text-[36px]">
          {content.heading}
        </h2>

        <div className="border-border mt-6 divide-y rounded-lg border">
          {content.items.map((item) => (
            <details
              key={item.q}
              className="group px-4"
              onToggle={(e) => {
                if (!(e.currentTarget as HTMLDetailsElement).open) return;
                track("faq_open", { question: item.q, page: "apex" });
              }}
            >
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 py-3 font-medium [&::-webkit-details-marker]:hidden">
                {item.q}
                <ChevronDown
                  className="text-text-muted size-5 shrink-0 transition-transform duration-150 group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <div className="text-text-muted pb-4 leading-relaxed">
                <p>{item.a}</p>
              </div>
            </details>
          ))}
        </div>

        <p className="text-text-muted mt-6 flex flex-wrap items-center gap-3 text-sm">
          {content.footNote}
          <WhatsAppLink href={platformWaLink("apex-faq")} context="apex-faq">
            {content.waLabel}
          </WhatsAppLink>
        </p>
      </div>
    </Section>
  );
}
