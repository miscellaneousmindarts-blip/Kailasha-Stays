"use client";

import { ChevronDown } from "lucide-react";

import { Section } from "@/components/landing/primitives";
import { WhatsAppLink } from "@/components/landing/actions";
import type { ResolvedFaq } from "@/lib/homepage";
import { track } from "@/lib/track";

type ComparisonRow = ResolvedFaq["comparisonRows"][number];

/**
 * Native <details> rather than a hand-rolled accordion: multiple rows open
 * simultaneously for free, and it's keyboard- and screen-reader-complete
 * without any ARIA of our own to get wrong.
 */
function ComparisonTable({ rows }: { rows: ComparisonRow[] }) {
  if (!rows.length) return null;

  return (
    <>
      {/* Table on md+, stacked cards on mobile — a 4-column table at 375px is
          unreadable, and this audience is on a phone. */}
      <div className="mt-4 hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">
            Compared with a typical hotel and a dharamshala
          </caption>
          <thead>
            <tr>
              <th scope="col" className="p-2 text-left font-medium" />
              <th
                scope="col"
                className="border-primary bg-primary-tint text-primary rounded-t-md border border-b-0 p-2 text-left font-semibold"
              >
                Us
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
            {rows.map((row, i) => (
              <tr key={row.label} className="border-border border-t">
                <th scope="row" className="p-2 text-left font-normal">
                  {row.label}
                </th>
                <td
                  className={`border-primary bg-primary-tint text-success border-x p-2 font-medium ${
                    i === rows.length - 1 ? "rounded-b-md border-b" : ""
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
          { name: "Us", key: "us" as const, highlight: true },
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
              {rows.map((row) => (
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
