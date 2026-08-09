"use client";

import { ExternalLink, Check } from "lucide-react";

import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { money } from "@/lib/format";
import type { Quote } from "@/lib/pricing";

/**
 * Every way to book this stay, priced, in one list.
 *
 * Exists because the booking card can't stack N full-width buttons: with
 * four or five platforms the primary action stops being obvious, and the
 * mobile bar has no room at all. So the card keeps one primary CTA and
 * defers the comparison here — which also makes the direct-is-cheaper case
 * stronger, since it's now against every platform at once rather than just
 * Airbnb.
 */
export function CompareChannelsSheet({
  open,
  onClose,
  quote,
  currency,
  canBookDirect,
  onBookDirect,
}: {
  open: boolean;
  onClose: () => void;
  quote: Quote;
  currency: string;
  canBookDirect: boolean;
  onBookDirect: () => void;
}) {
  const directTotal = quote.direct.total;
  const priced = quote.channels.filter((c) => c.total !== null);
  const unpriced = quote.channels.filter((c) => c.total === null);

  // Direct only earns the badge if it actually is the cheapest — the whole
  // comparison is worthless the moment it says something the numbers don't.
  const directIsCheapest =
    directTotal !== null && priced.every((c) => (c.total as number) >= directTotal);

  return (
    <ResponsiveModal open={open} onClose={onClose} title="Where to book">
      <div className="space-y-2">
        {canBookDirect ? (
          <button
            type="button"
            onClick={() => {
              onClose();
              onBookDirect();
            }}
            className="border-primary bg-primary-tint pressable flex w-full items-center gap-3 rounded-lg border-2 p-4 text-left"
          >
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-medium">Book directly</span>
                {directIsCheapest ? (
                  <span className="bg-success/15 text-success flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium">
                    <Check className="size-3" aria-hidden="true" />
                    Best price
                  </span>
                ) : null}
              </span>
              {/* Short by design: at 375px the longer phrasing wrapped to two
                  lines and made the primary row half again as tall as the
                  options it's meant to be compared against. */}
              <span className="text-text-muted mt-0.5 block text-sm">
                No payment now
              </span>
            </span>
            {directTotal !== null ? (
              <span className="tabular shrink-0 font-semibold">
                {money(directTotal, currency)}
              </span>
            ) : null}
          </button>
        ) : null}

        {priced.map((channel) => (
          <ChannelRow
            key={channel.id}
            name={channel.name}
            href={channel.bookingUrl}
            total={channel.total}
            saving={channel.savingVsDirect}
            currency={currency}
          />
        ))}

        {unpriced.map((channel) => (
          <ChannelRow
            key={channel.id}
            name={channel.name}
            href={channel.bookingUrl}
            total={null}
            saving={null}
            currency={currency}
          />
        ))}
      </div>

      {priced.length ? (
        <p className="text-text-muted mt-4 text-xs">
          Prices on other platforms are estimates based on their usual booking
          fees — check there for the exact amount.
        </p>
      ) : null}
    </ResponsiveModal>
  );
}

function ChannelRow({
  name,
  href,
  total,
  saving,
  currency,
}: {
  name: string;
  href: string | null;
  total: number | null;
  saving: number | null;
  currency: string;
}) {
  const body = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{name}</span>
        {saving !== null && saving > 0 ? (
          // "than direct", not "than booking direct": the longer phrasing
          // wrapped to a second line on a 320px screen, and with five
          // platforms listed that compounds into a lot of extra scrolling.
          <span className="text-text-muted mt-0.5 block text-sm">
            {money(saving, currency)} more than direct
          </span>
        ) : null}
      </span>
      {total !== null ? (
        <span className="tabular shrink-0">{money(total, currency)}</span>
      ) : null}
      {href ? (
        <ExternalLink className="text-text-muted size-4 shrink-0" aria-hidden="true" />
      ) : null}
    </>
  );

  const className =
    "border-border flex w-full items-center gap-3 rounded-lg border p-4 text-left";

  // A channel with no link still belongs in the list — its price is part of
  // the comparison even when the guest has to find the listing themselves.
  if (!href) {
    return <div className={className}>{body}</div>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${className} hover:bg-surface-subtle pressable`}
    >
      {body}
    </a>
  );
}
