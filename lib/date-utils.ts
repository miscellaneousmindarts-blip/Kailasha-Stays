import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
} from "date-fns";

export { addDays, addMonths, isAfter, isBefore, isSameDay, isSameMonth, startOfDay, startOfMonth };

/**
 * Parses a "yyyy-MM-dd" string as a LOCAL calendar date (midnight in the
 * viewer's own timezone) — never via Date.parse/toISOString, which round-trip
 * through UTC and can shift the date by one day for viewers ahead of UTC.
 */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Formats using local date components — the inverse of parseISODate. */
export function toISODate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/** One month as a 7-column grid (Sunday-first), padded with nulls for alignment. */
export function buildMonthGrid(monthStart: Date): (Date | null)[] {
  const start = startOfMonth(monthStart);
  const end = endOfMonth(monthStart);
  const days = eachDayOfInterval({ start, end });
  const leading = getDay(start);
  const cells: (Date | null)[] = Array(leading).fill(null);
  cells.push(...days);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function nightsBetween(checkIn: Date, checkOut: Date): number {
  return Math.round((checkOut.getTime() - checkIn.getTime()) / 86_400_000);
}

export function monthKey(d: Date): number {
  return d.getFullYear() * 12 + d.getMonth();
}
