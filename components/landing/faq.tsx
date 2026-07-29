"use client";

import { ChevronDown } from "lucide-react";

import { Eyebrow, Section } from "@/components/landing/primitives";
import { WhatsAppLink } from "@/components/landing/actions";
import { COMPARISON_ROWS, type FaqItem } from "@/lib/landing-faq";
import { track } from "@/lib/track";

/**
 * Native <details> rather than a hand-rolled accordion: multiple rows open
 * simultaneously for free, and it's keyboard- and screen-reader-complete
 * without any ARIA of our own to get wrong.
 */
function ComparisonTable() {
  return (
    <>
      {/* Table on md+, stacked cards on mobile — a 4-column table at 375px is
          unreadable, and this audience is on a phone. */}
      <div className="mt-4 hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">
            Kailasha Stays compared with a typical hotel and a dharamshala
          </caption>
          <thead>
            <tr>
              <th scope="col" className="p-2 text-left font-medium" />
              <th
                scope="col"
                className="border-primary bg-primary-tint text-primary rounded-t-md border border-b-0 p-2 text-left font-semibold"
              >
                Kailasha Stays
              </th>
              <th scope="col" className="text-text-muted p-2 text-left font-medium">
                Typical hotel
              </th>
              <th scope="col" className="text-text-muted p-2 text-left font-medium">
                Dharamshala
              </th>
            </tr>
          </thead>
          <tbody>
            {COMPARISON_ROWS.map((row, i) => (
              <tr key={row.label} className="border-border border-t">
                <th scope="row" className="p-2 text-left font-normal">
                  {row.label}
                </th>
                <td
                  className={`border-primary bg-primary-tint text-success border-x p-2 font-medium ${
                    i === COMPARISON_ROWS.length - 1 ? "rounded-b-md border-b" : ""
                  }`}
                >
                  {row.us}
                </td>
                <td className="text-text-muted p-2">{row.hotel}</td>
                <td className="text-text-muted p-2">{row.dharamshala}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 space-y-3 md:hidden">
        {[
          { name: "Kailasha Stays", key: "us" as const, highlight: true },
          { name: "Typical hotel", key: "hotel" as const, highlight: false },
          { name: "Dharamshala", key: "dharamshala" as const, highlight: false },
        ].map((col) => (
          <div
            key={col.name}
            className={`rounded-md border p-3 ${
              col.highlight ? "border-primary bg-primary-tint" : "border-border"
            }`}
          >
            <p className={`font-semibold ${col.highlight ? "text-primary" : ""}`}>
              {col.name}
            </p>
            <dl className="mt-2 space-y-1 text-sm">
              {COMPARISON_ROWS.map((row) => (
                <div key={row.label} className="flex justify-between gap-3">
                  <dt className="text-text-muted">{row.label}</dt>
                  <dd className="shrink-0 text-right font-medium">{row[col.key]}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </>
  );
}

export function Faq({
  items,
  whatsappHref,
}: {
  items: FaqItem[];
  whatsappHref: string | null;
}) {
  return (
    <Section>
      <div className="mx-auto max-w-[760px]">
        <Eyebrow hi="आपके सवाल" en="Practical answers" />
        <h2 className="mt-3 text-[23px] font-semibold tracking-[-0.015em] md:text-[32px]">
          The things families actually ask us
        </h2>

        <div className="border-border mt-6 divide-y rounded-lg border">
          {items.map((item) => (
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
                {item.comparison ? <ComparisonTable /> : null}
              </div>
            </details>
          ))}
        </div>

        {whatsappHref ? (
          <p className="text-text-muted mt-6 flex flex-wrap items-center gap-3 text-sm">
            Still have a question? Just ask — we don&apos;t mind.
            <WhatsAppLink href={whatsappHref} context="lp-faq">
              Ask on WhatsApp
            </WhatsAppLink>
          </p>
        ) : null}
      </div>
    </Section>
  );
}
