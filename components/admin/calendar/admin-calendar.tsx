"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, Loader2, Plus } from "lucide-react";

import {
  addMonths,
  buildMonthGrid,
  isBefore,
  isSameDay,
  parseISODate,
  startOfMonth,
  toISODate,
} from "@/lib/date-utils";
import { getMonthEvents } from "@/app/admin/(dashboard)/calendar/actions";
import { AddBlockModal } from "@/components/admin/calendar/add-block-modal";
import { EventDetailModal } from "@/components/admin/calendar/event-detail-modal";
import type { PropertyOption } from "@/lib/admin/queries";

export type CalEvent = {
  id: string;
  kind: "booking" | "external";
  source: string;
  label: string;
  start: Date;
  end: Date;
  bookingId?: string;
};

const SOURCE_COLOR: Record<string, string> = {
  direct: "bg-[#16a34a] text-white",
  airbnb: "bg-[#e0484d] text-white",
  booking_com: "bg-[#2563eb] text-white",
  blocked: "bg-[#6b7280] text-white",
  other: "bg-[#6b7280] text-white",
};

const LEGEND = [
  { source: "direct", label: "Direct booking" },
  { source: "airbnb", label: "Airbnb" },
  { source: "booking_com", label: "Booking.com" },
  { source: "blocked", label: "Manually blocked" },
];

export function AdminCalendar({ properties }: { properties: PropertyOption[] }) {
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "");
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [blockDate, setBlockDate] = useState<Date | null>(null);
  const [detail, setDetail] = useState<CalEvent | null>(null);

  useEffect(() => {
    if (!propertyId) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      const rangeStart = toISODate(month);
      const rangeEnd = toISODate(addMonths(month, 1));
      const { bookings, external } = await getMonthEvents(propertyId, rangeStart, rangeEnd);
      if (cancelled) return;

      setEvents([
        ...bookings.map((b) => ({
          id: `b-${b.id}`,
          kind: "booking" as const,
          source: b.source,
          label: b.guest_name ?? (b.source === "blocked" ? "Blocked" : "Guest"),
          start: parseISODate(b.check_in),
          end: parseISODate(b.check_out),
          bookingId: b.id,
        })),
        ...external.map((e) => ({
          id: `e-${e.id}`,
          kind: "external" as const,
          source: "other",
          label: e.summary ?? "Synced booking",
          start: parseISODate(e.start_date),
          end: parseISODate(e.end_date),
        })),
      ]);
      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [propertyId, month, refreshKey]);

  const cells = useMemo(() => buildMonthGrid(month), [month]);

  function eventsOnDay(day: Date) {
    return events.filter((e) => !isBefore(day, e.start) && isBefore(day, e.end));
  }

  const refresh = () => setRefreshKey((k) => k + 1);

  return (
    <div>
      {properties.length > 1 ? (
        <div className="flex flex-wrap gap-2 overflow-x-auto">
          {properties.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPropertyId(p.id)}
              className={`pressable flex h-10 shrink-0 items-center rounded-full border px-4 text-sm font-medium ${
                propertyId === p.id
                  ? "border-primary bg-primary-tint text-primary"
                  : "border-border hover:bg-surface-subtle"
              }`}
            >
              {p.title}
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonth((m) => addMonths(m, -1))}
          aria-label="Previous month"
          className="hover:bg-surface-subtle pressable flex size-10 items-center justify-center rounded-full"
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
        </button>
        <p className="font-semibold">{format(month, "MMMM yyyy")}</p>
        <button
          type="button"
          onClick={() => setMonth((m) => addMonths(m, 1))}
          aria-label="Next month"
          className="hover:bg-surface-subtle pressable flex size-10 items-center justify-center rounded-full"
        >
          <ChevronRight className="size-5" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs">
        {LEGEND.map((l) => (
          <span key={l.source} className="flex items-center gap-1.5">
            <span
              className={`size-2.5 rounded-full ${SOURCE_COLOR[l.source]}`}
              aria-hidden="true"
            />
            {l.label}
          </span>
        ))}
      </div>

      <div className="relative mt-3">
        {loading ? (
          <div className="bg-background/60 absolute inset-0 z-10 flex items-start justify-center pt-12">
            <Loader2 className="text-text-muted size-6 animate-spin" aria-hidden="true" />
          </div>
        ) : null}
        <div className="grid grid-cols-7 gap-px">
          {["S", "M", "T", "W", "T", "F", "S"].map((w, i) => (
            <div key={i} className="text-text-muted pb-1 text-center text-xs">
              {w}
            </div>
          ))}
          {cells.map((day, i) => {
            if (!day) return <div key={i} className="min-h-20" />;
            const dayEvents = eventsOnDay(day);
            const today = isSameDay(day, new Date());
            return (
              <button
                key={i}
                type="button"
                onClick={() => (dayEvents.length ? setDetail(dayEvents[0]) : setBlockDate(day))}
                className="border-border hover:bg-surface-subtle flex min-h-20 flex-col items-stretch gap-1 rounded-md border p-1 text-left"
              >
                <span
                  className={`tabular text-xs ${today ? "text-primary font-semibold" : "text-text-muted"}`}
                >
                  {day.getDate()}
                </span>
                <div className="flex flex-col gap-0.5">
                  {dayEvents.slice(0, 2).map((e) => (
                    <span
                      key={e.id}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        setDetail(e);
                      }}
                      className={`truncate rounded px-1 py-0.5 text-[10px] font-medium ${SOURCE_COLOR[e.source] ?? SOURCE_COLOR.other}`}
                    >
                      {e.label}
                    </span>
                  ))}
                  {dayEvents.length > 2 ? (
                    <span className="text-text-muted text-[10px]">
                      +{dayEvents.length - 2} more
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setBlockDate(new Date())}
        className="border-border hover:bg-surface-subtle pressable mt-4 flex h-11 items-center gap-2 rounded-md border border-dashed px-4 text-sm font-medium"
      >
        <Plus className="size-4" aria-hidden="true" />
        Add manual block
      </button>

      {blockDate && propertyId ? (
        <AddBlockModal
          propertyId={propertyId}
          initialDate={blockDate}
          onClose={() => setBlockDate(null)}
          onAdded={() => {
            setBlockDate(null);
            refresh();
          }}
        />
      ) : null}

      {detail ? (
        <EventDetailModal
          event={detail}
          propertyId={propertyId}
          onClose={() => setDetail(null)}
          onRemoved={() => {
            setDetail(null);
            refresh();
          }}
        />
      ) : null}
    </div>
  );
}
