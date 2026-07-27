"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AvailabilityCalendar,
  type SelectedRange,
  type UnavailableRange,
} from "@/components/booking/availability-calendar";
import { formatDate, formatDateShort } from "@/lib/format";
import { nightsBetween } from "@/lib/date-utils";

export function DatePickerField({
  unavailable,
  value,
  onChange,
  variant = "field",
  open: openProp,
  onOpenChange,
  loading = false,
}: {
  unavailable: UnavailableRange[];
  value: SelectedRange;
  onChange: (next: SelectedRange) => void;
  /** "field": full-width bordered row (desktop card). "compact": inline text trigger (mobile bar). */
  variant?: "field" | "compact";
  /**
   * Optional controlled open state, so a "Book now" button elsewhere can pop
   * the calendar. Each rendered instance must be given its OWN state — Radix
   * portals popover content to <body> regardless of a CSS-hidden trigger, so
   * one shared flag across the desktop/mobile instances renders both at once.
   */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Availability still loading — passed through so no date can be picked yet. */
  loading?: boolean;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = openProp ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;
  const nights =
    value.checkIn && value.checkOut
      ? nightsBetween(value.checkIn, value.checkOut)
      : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {variant === "compact" ? (
          <button
            type="button"
            className="pressable -mx-1 flex min-h-11 flex-col items-start justify-center rounded-md px-1 text-left"
          >
            {value.checkIn && value.checkOut ? (
              /* short form: the bottom bar shares this row with the total, and
                 the full weekday+year format forces both to truncate */
              <span className="text-text-muted truncate text-sm whitespace-nowrap">
                {formatDateShort(value.checkIn)} – {formatDateShort(value.checkOut)}
              </span>
            ) : (
              <span className="text-text-muted text-sm underline-offset-2 hover:underline">
                Add dates
              </span>
            )}
          </button>
        ) : (
          <button
            type="button"
            className="border-border hover:border-foreground/30 pressable flex w-full items-center gap-3 rounded-md border px-4 py-3 text-left"
          >
            <CalendarDays className="text-text-muted size-5 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              {value.checkIn && value.checkOut ? (
                <>
                  <span className="block font-medium">
                    {formatDate(value.checkIn)} – {formatDate(value.checkOut)}
                  </span>
                  <span className="text-text-muted text-sm">
                    {nights} {nights === 1 ? "night" : "nights"}
                  </span>
                </>
              ) : value.checkIn ? (
                <span className="block font-medium">
                  {formatDate(value.checkIn)} – Add check-out
                </span>
              ) : (
                <span className="block font-medium">Add dates</span>
              )}
            </span>
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        // Anchored to the mobile bottom bar there's no room below, so Radix
        // flips it upward — without padding it ends up flush against the top
        // edge, overlapping the header.
        collisionPadding={12}
        className="w-[92vw] max-w-[420px] p-4 sm:w-[620px] sm:max-w-[620px]"
      >
        <AvailabilityCalendar
          unavailable={unavailable}
          value={value}
          onChange={onChange}
          loading={loading}
        />
        <div className="border-border mt-3 flex items-center justify-between border-t pt-3">
          <button
            type="button"
            onClick={() => onChange({ checkIn: null, checkOut: null })}
            className="hover:bg-surface-subtle pressable flex h-11 items-center rounded-md px-3 text-sm font-medium underline-offset-2 hover:underline"
          >
            Clear dates
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={!value.checkIn || !value.checkOut}
            className="bg-primary text-primary-foreground hover:bg-primary-hover pressable flex h-11 items-center rounded-md px-5 text-sm font-medium disabled:opacity-40"
          >
            Done
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
