import { addDays, isBefore, toISODate } from "@/lib/date-utils";
import type { RatePeriod } from "@/lib/types/database";

/**
 * Nightly rates resolved per channel, shared by the public booking card and
 * the admin pricing editor so a quote can never disagree between the two.
 *
 * For each night: a covering rate_period wins, otherwise the property default.
 * A night with no price at all in a channel makes that channel's total null —
 * the UI then omits the figure rather than quoting a wrong or partial one.
 */

export type PriceDefaults = {
  /** Default direct nightly rate. */
  base: number | null;
  /** Default Airbnb nightly rate. */
  airbnb: number | null;
};

export type NightlyRate = {
  /** yyyy-MM-dd of the night being charged. */
  date: string;
  direct: number | null;
  airbnb: number | null;
  /** Label of the rate period that set this night, if any. */
  label: string | null;
};

export type ChannelQuote = {
  /** null when at least one night has no price for this channel. */
  total: number | null;
  /** Mean per-night rate across the stay, for "₹X / night" summaries. */
  perNight: number | null;
};

export type Quote = {
  nights: number;
  nightly: NightlyRate[];
  direct: ChannelQuote;
  airbnb: ChannelQuote;
  /** Positive when booking direct costs less than Airbnb. */
  savingVsAirbnb: number | null;
};

/** The rate period covering a given night, if one exists. */
function periodFor(
  periods: RatePeriod[],
  night: string,
): RatePeriod | undefined {
  // Half-open [start, end): a night is covered when start <= night < end.
  // Plain string comparison is safe and fast for yyyy-MM-dd.
  return periods.find((p) => p.start_date <= night && night < p.end_date);
}

function channelTotal(values: (number | null)[]): ChannelQuote {
  if (!values.length || values.some((v) => v === null)) {
    return { total: null, perNight: null };
  }
  const total = values.reduce<number>((sum, v) => sum + (v as number), 0);
  return { total, perNight: total / values.length };
}

/**
 * Price a stay. checkOut is exclusive, so a 1-night stay charges checkIn only.
 */
export function quoteStay({
  checkIn,
  checkOut,
  periods,
  defaults,
}: {
  checkIn: Date;
  checkOut: Date;
  periods: RatePeriod[];
  defaults: PriceDefaults;
}): Quote {
  const nightly: NightlyRate[] = [];

  for (let d = checkIn; isBefore(d, checkOut); d = addDays(d, 1)) {
    const date = toISODate(d);
    const period = periodFor(periods, date);
    nightly.push({
      date,
      direct: period ? period.direct_price : defaults.base,
      // A period that sets no Airbnb price falls back to the property default
      // rather than to its own direct price — the two channels stay independent.
      airbnb: period?.airbnb_price ?? defaults.airbnb,
      label: period?.label ?? null,
    });
  }

  const direct = channelTotal(nightly.map((n) => n.direct));
  const airbnb = channelTotal(nightly.map((n) => n.airbnb));

  return {
    nights: nightly.length,
    nightly,
    direct,
    airbnb,
    savingVsAirbnb:
      direct.total !== null && airbnb.total !== null
        ? airbnb.total - direct.total
        : null,
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
