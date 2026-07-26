"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

import {
  addDays,
  addMonths,
  buildMonthGrid,
  isAfter,
  isBefore,
  isSameDay,
  monthKey,
  parseISODate,
  startOfDay,
  startOfMonth,
} from "@/lib/date-utils";
import { cn } from "@/lib/utils";

export type UnavailableRange = { start_date: string; end_date: string };
export type SelectedRange = { checkIn: Date | null; checkOut: Date | null };

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

/**
 * Two-month (desktop) / one-month (mobile, second month hidden via CSS)
 * availability calendar. Blocked nights come from get_unavailable_dates and
 * are simply un-clickable — there is no invalid state to recover from, so no
 * "those dates are taken" toast is needed (PLAN §8.3).
 */
export function AvailabilityCalendar({
  unavailable,
  value,
  onChange,
  minStayNights = 1,
}: {
  unavailable: UnavailableRange[];
  value: SelectedRange;
  onChange: (next: SelectedRange) => void;
  minStayNights?: number;
}) {
  const today = startOfDay(new Date());
  const [baseMonth, setBaseMonth] = useState(() =>
    startOfMonth(value.checkIn ?? today),
  );

  const ranges = useMemo(
    () =>
      unavailable.map((r) => ({
        start: parseISODate(r.start_date),
        end: parseISODate(r.end_date),
      })),
    [unavailable],
  );

  function isNightBlocked(day: Date) {
    return ranges.some((r) => !isBefore(day, r.start) && isBefore(day, r.end));
  }

  const { checkIn, checkOut } = value;
  const selectingCheckout = Boolean(checkIn) && !checkOut;

  // first blocked night strictly after checkIn — bounds how far checkout can go
  const maxCheckout = useMemo(() => {
    if (!checkIn) return null;
    let earliest: Date | null = null;
    for (const r of ranges) {
      if (isAfter(r.start, checkIn) && (!earliest || isBefore(r.start, earliest))) {
        earliest = r.start;
      }
    }
    return earliest;
  }, [ranges, checkIn]);

  function cellInfo(day: Date) {
    const isPast = isBefore(day, today);
    let disabled = isPast;
    if (!disabled) {
      if (!selectingCheckout) {
        disabled = isNightBlocked(day);
      } else {
        const minCheckout = addDays(checkIn as Date, minStayNights);
        disabled =
          isBefore(day, minCheckout) ||
          (maxCheckout !== null && isAfter(day, maxCheckout));
      }
    }
    const isCheckIn = Boolean(checkIn) && isSameDay(day, checkIn as Date);
    const isCheckOut = Boolean(checkOut) && isSameDay(day, checkOut as Date);
    const inRange =
      Boolean(checkIn && checkOut) &&
      isAfter(day, checkIn as Date) &&
      isBefore(day, checkOut as Date);
    return { disabled, isCheckIn, isCheckOut, inRange };
  }

  function handleSelect(day: Date) {
    if (!checkIn || checkOut) {
      onChange({ checkIn: day, checkOut: null });
    } else if (!isAfter(day, checkIn)) {
      onChange({ checkIn: day, checkOut: null });
    } else {
      onChange({ checkIn, checkOut: day });
    }
  }

  const canGoPrev = monthKey(baseMonth) > monthKey(today);
  const months = [baseMonth, addMonths(baseMonth, 1)];

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between px-1">
        <button
          type="button"
          onClick={() => setBaseMonth((m) => addMonths(m, -1))}
          disabled={!canGoPrev}
          aria-label="Previous month"
          className="hover:bg-surface-subtle pressable flex size-9 items-center justify-center rounded-full disabled:opacity-30"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => setBaseMonth((m) => addMonths(m, 1))}
          aria-label="Next month"
          className="hover:bg-surface-subtle pressable flex size-9 items-center justify-center rounded-full"
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="grid gap-x-6 gap-y-6 sm:grid-cols-2">
        {months.map((month, i) => (
          <div key={monthKey(month)} className={i === 1 ? "hidden sm:block" : ""}>
            <MonthGrid month={month} cellInfo={cellInfo} onSelect={handleSelect} />
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthGrid({
  month,
  cellInfo,
  onSelect,
}: {
  month: Date;
  cellInfo: (d: Date) => {
    disabled: boolean;
    isCheckIn: boolean;
    isCheckOut: boolean;
    inRange: boolean;
  };
  onSelect: (d: Date) => void;
}) {
  const cells = buildMonthGrid(month);

  return (
    <div>
      <p className="mb-2 text-center text-sm font-medium">
        {format(month, "MMMM yyyy")}
      </p>
      <div className="grid grid-cols-7">
        {WEEKDAYS.map((w, i) => (
          <div
            key={i}
            className="text-text-muted py-1 text-center text-xs"
            aria-hidden="true"
          >
            {w}
          </div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const { disabled, isCheckIn, isCheckOut, inRange } = cellInfo(day);
          const selected = isCheckIn || isCheckOut;
          const banded = inRange || isCheckIn || isCheckOut;

          return (
            <div key={i} className="relative py-0.5">
              {banded ? (
                <div
                  className="bg-primary-tint absolute inset-y-0.5 left-0 right-0"
                  aria-hidden="true"
                />
              ) : null}
              <button
                type="button"
                disabled={disabled}
                onClick={() => onSelect(day)}
                aria-pressed={selected}
                aria-label={format(day, "EEEE, MMMM d, yyyy")}
                className={cn(
                  "tabular relative z-10 mx-auto flex aspect-square w-full max-w-11 items-center justify-center rounded-full text-sm transition-colors",
                  disabled &&
                    "text-text-muted/50 pointer-events-none line-through decoration-1",
                  !disabled && !selected && "hover:bg-surface-subtle",
                  selected && "bg-primary text-primary-foreground font-medium",
                )}
              >
                {day.getDate()}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
