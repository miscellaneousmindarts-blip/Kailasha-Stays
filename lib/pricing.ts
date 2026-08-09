import { addDays, isBefore, toISODate } from "@/lib/date-utils";
import type { BookingChannel, RatePeriod } from "@/lib/types/database";

/**
 * Nightly rates resolved per channel, shared by the public booking card and
 * the admin pricing editor so a quote can never disagree between the two.
 *
 * The DIRECT rate is the only one stored per night: for each night a covering
 * rate_period wins, otherwise the property default. Every other channel is
 * derived from that night's direct rate through its own booking_channels row
 * — a percentage markup, a fixed nightly price, or no price at all.
 *
 * Deriving rather than storing is what lets an owner add a fifth platform
 * without re-entering a price calendar for it, and what keeps every channel
 * correct when a rate period changes the direct rate underneath them. The
 * cost is that an OTA total is this site's *estimate* of that platform's
 * price, not a live quote from it — the UI says so rather than implying
 * otherwise.
 */

export type PriceDefaults = {
  /** Default direct nightly rate. */
  base: number | null;
};

export type NightlyRate = {
  /** yyyy-MM-dd of the night being charged. */
  date: string;
  direct: number | null;
  /** Label of the rate period that set this night, if any. */
  label: string | null;
};

export type ChannelTotals = {
  /** null when at least one night has no price for this channel. */
  total: number | null;
  /** Mean per-night rate across the stay, for "₹X / night" summaries. */
  perNight: number | null;
};

export type ChannelQuote = ChannelTotals & {
  id: string;
  name: string;
  slug: string | null;
  bookingUrl: string | null;
  /** Positive when booking direct costs less than this channel. */
  savingVsDirect: number | null;
};

export type Quote = {
  nights: number;
  nightly: NightlyRate[];
  direct: ChannelTotals;
  /** Every active channel, cheapest first, priced ones before unpriced. */
  channels: ChannelQuote[];
  /**
   * Saving against the CHEAPEST priced channel — deliberately the smallest
   * true saving, not the largest.
   *
   * Quoting the biggest gap ("save up to X" against the dearest platform)
   * is the flattering read and the one a guest can immediately disprove:
   * the cheapest alternative's total is shown right next to it. This figure
   * holds whichever platform they were about to use, and is null when direct
   * isn't actually the cheapest — in which case there is no saving to claim.
   */
  savingVsCheapest: number | null;
};

/** Only the fields pricing needs — lets callers pass a narrowed public row. */
export type ChannelInput = Pick<
  BookingChannel,
  "id" | "name" | "slug" | "booking_url" | "price_mode" | "markup_pct" | "fixed_nightly"
>;

/** The rate period covering a given night, if one exists. */
function periodFor(
  periods: RatePeriod[],
  night: string,
): RatePeriod | undefined {
  // Half-open [start, end): a night is covered when start <= night < end.
  // Plain string comparison is safe and fast for yyyy-MM-dd.
  return periods.find((p) => p.start_date <= night && night < p.end_date);
}

function totalsOf(values: (number | null)[]): ChannelTotals {
  if (!values.length || values.some((v) => v === null)) {
    return { total: null, perNight: null };
  }
  const total = values.reduce<number>((sum, v) => sum + (v as number), 0);
  return { total, perNight: total / values.length };
}

/**
 * What one channel charges for a single night, given the direct rate for it.
 *
 * Rounded to a whole unit per night rather than at the total: a guest
 * comparing "₹3,750 / night" against a 2-night total of ₹7,500 should find
 * they agree, which they don't if the rounding happens once at the end.
 */
function channelNightly(channel: ChannelInput, direct: number | null): number | null {
  if (channel.price_mode === "fixed") return channel.fixed_nightly;
  if (channel.price_mode === "markup") {
    if (direct === null || channel.markup_pct === null) return null;
    return Math.round(direct * (1 + channel.markup_pct / 100));
  }
  return null;
}

/**
 * Price a stay. checkOut is exclusive, so a 1-night stay charges checkIn only.
 */
export function quoteStay({
  checkIn,
  checkOut,
  periods,
  defaults,
  channels = [],
}: {
  checkIn: Date;
  checkOut: Date;
  periods: RatePeriod[];
  defaults: PriceDefaults;
  channels?: ChannelInput[];
}): Quote {
  const nightly: NightlyRate[] = [];

  for (let d = checkIn; isBefore(d, checkOut); d = addDays(d, 1)) {
    const date = toISODate(d);
    const period = periodFor(periods, date);
    nightly.push({
      date,
      direct: period ? period.direct_price : defaults.base,
      label: period?.label ?? null,
    });
  }

  const direct = totalsOf(nightly.map((n) => n.direct));

  const quoted: ChannelQuote[] = channels.map((c) => {
    const totals = totalsOf(nightly.map((n) => channelNightly(c, n.direct)));
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      bookingUrl: c.booking_url,
      ...totals,
      savingVsDirect:
        totals.total !== null && direct.total !== null
          ? totals.total - direct.total
          : null,
    };
  });

  // Cheapest first so the strongest comparison leads; channels with no price
  // sort last, since an unpriced link says nothing about value either way.
  quoted.sort((a, b) => {
    if (a.total === null && b.total === null) return 0;
    if (a.total === null) return 1;
    if (b.total === null) return -1;
    return a.total - b.total;
  });

  // quoted is already cheapest-first, so the first priced entry IS the
  // cheapest alternative.
  const cheapest = quoted.find((c) => c.total !== null) ?? null;
  const savingVsCheapest =
    cheapest && cheapest.savingVsDirect !== null && cheapest.savingVsDirect > 0
      ? cheapest.savingVsDirect
      : null;

  return {
    nights: nightly.length,
    nightly,
    direct,
    channels: quoted,
    savingVsCheapest,
  };
}

/**
 * The "from ₹X / night" headline shown before any dates are picked: the
 * cheapest direct rate a guest could get, across the defaults and any
 * upcoming rate periods.
 */
export function lowestNightlyRate(
  periods: RatePeriod[],
  defaults: PriceDefaults,
): number | null {
  const candidates = [
    defaults.base,
    ...periods.map((p) => p.direct_price),
  ].filter((v): v is number => v !== null);
  return candidates.length ? Math.min(...candidates) : null;
}
