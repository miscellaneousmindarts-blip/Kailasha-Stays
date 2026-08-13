"use client";

import { ChevronDown } from "lucide-react";

import { Section } from "@/components/landing/primitives";
import { WhatsAppLink } from "@/components/landing/actions";
import { ComparisonTable } from "@/components/landing/comparison-table";
import type { ResolvedFaq } from "@/lib/homepage";
import { track } from "@/lib/track";

/**
 * resolveFaq() in lib/homepage.ts already drops the whole section when zero
 * items survive token resolution, so `resolved === null` is the only gate
 * this component needs — everything else here is plain resolved data, which
 * (unlike the old `copy` reader function) crosses the server/client boundary
 * without needing to be pre-flattened into individual string props.
 */
export function Faq({
  resolved,
  whatsappHref,
}: {
  resolved: ResolvedFaq | null;
  whatsappHref: string | null;
}) {
  if (!resolved) return null;

  return (
    <Section>
      <div className="mx-auto max-w-[760px]">
        <h2 className="mt-3 font-display text-[26px] leading-[1.15] font-semibold md:text-[36px]">
          {resolved.heading}
        </h2>

        <div className="border-border mt-6 divide-y rounded-lg border">
          {resolved.items.map((item) => (
            <details
              key={item.q}
              name={undefined}
              className="group px-4"
              onToggle={(e) => {
                if (!(e.currentTarget as HTMLDetailsElement).open) return;
                // This becomes a live objection ranking — read it monthly.
                track("faq_open", { question: item.q });
                if (item.comparison) track("comparison_open");
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
                {item.comparison ? <ComparisonTable rows={resolved.comparisonRows} /> : null}
              </div>
            </details>
          ))}
        </div>

        {whatsappHref ? (
          <p className="text-text-muted mt-6 flex flex-wrap items-center gap-3 text-sm">
            {resolved.closingLine || "Still have a question? Just ask — we don't mind."}
            <WhatsAppLink href={whatsappHref} context="lp-faq">
              Ask on WhatsApp
            </WhatsAppLink>
          </p>
        ) : null}
      </div>
    </Section>
  );
}
