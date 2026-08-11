"use client";

import Link from "next/link";
import { ExternalLink, Loader2, Trash2, UserPlus } from "lucide-react";

import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { useSaveAction } from "@/components/admin/use-save-action";
import { removeManualBlock } from "@/app/admin/(dashboard)/calendar/actions";
import { formatDate } from "@/lib/format";
import { toISODate } from "@/lib/date-utils";
import type { CalEvent } from "@/components/admin/calendar/admin-calendar";

const SOURCE_LABEL: Record<string, string> = {
  direct: "Direct booking",
  airbnb: "Airbnb",
  booking_com: "Booking.com",
  blocked: "Manual block",
  other: "Synced booking",
};

/**
 * Best-effort platform guess from the synced event's own summary text, e.g.
 * "Airbnb (Not available)" — good enough to preselect the right source on
 * the booking form without a join back through calendar_sources just for a
 * default the admin can still change in one tap.
 */
function guessSource(label: string): "airbnb" | "booking_com" | "other" {
  const lower = label.toLowerCase();
  if (lower.includes("airbnb")) return "airbnb";
  if (lower.includes("booking.com") || lower.includes("booking_com")) return "booking_com";
  return "other";
}

export function EventDetailModal({
  event,
  propertyId,
  onClose,
  onRemoved,
}: {
  event: CalEvent;
  propertyId: string;
  onClose: () => void;
  onRemoved: () => void;
}) {
  const remove = useSaveAction(removeManualBlock);

  const isManualBlock = event.kind === "booking" && event.source === "blocked";
  const isSyncedEvent = event.kind === "external";

  const dateParams = `check_in=${toISODate(event.start)}&check_out=${toISODate(event.end)}&property_id=${propertyId}`;

  return (
    <ResponsiveModal open onClose={onClose} title={SOURCE_LABEL[event.source] ?? "Event"}>
      <div className="space-y-4">
        <div>
          <p className="text-lg font-semibold">{event.label}</p>
          <p className="text-text-muted">
            {formatDate(event.start)} – {formatDate(event.end)}
          </p>
        </div>

        {event.kind === "booking" && event.source !== "blocked" && event.bookingId ? (
          <Link
            href={`/admin/bookings/${event.bookingId}`}
            className="border-border hover:bg-surface-subtle pressable flex h-11 items-center justify-center gap-2 rounded-md border font-medium"
          >
            View booking
            <ExternalLink className="size-4" aria-hidden="true" />
          </Link>
        ) : null}

        {isManualBlock && event.bookingId ? (
          <>
            <Link
              href={`/admin/bookings/new?convert_block_id=${event.bookingId}&source=other&${dateParams}`}
              className="bg-primary text-primary-foreground hover:bg-primary-hover pressable flex h-11 items-center justify-center gap-2 rounded-md font-medium"
            >
              <UserPlus className="size-4" aria-hidden="true" />
              Add guest details
            </Link>
            <p className="text-text-muted text-sm">
              For a booking that has nowhere else blocking these dates — e.g.
              MakeMyTrip, or a platform without its own calendar sync. Turns
              this exact block into that booking rather than adding a second
              one on top of it.
            </p>

            <button
              type="button"
              onClick={async () => {
                const ok = await remove.runAndWait(event.bookingId as string);
                if (ok) onRemoved();
              }}
              disabled={remove.pending}
              className="border-danger text-danger hover:bg-danger/10 pressable flex h-11 w-full items-center justify-center gap-2 rounded-md border font-medium disabled:opacity-60"
            >
              {remove.pending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="size-4" aria-hidden="true" />
              )}
              Remove block
            </button>
          </>
        ) : null}
        {remove.error ? (
          <p role="alert" className="text-danger text-sm">
            {remove.error}
          </p>
        ) : null}

        {isSyncedEvent ? (
          <>
            <Link
              href={`/admin/bookings/new?source=${guessSource(event.label)}&blocks_calendar=false&${dateParams}`}
              className="bg-primary text-primary-foreground hover:bg-primary-hover pressable flex h-11 items-center justify-center gap-2 rounded-md font-medium"
            >
              <UserPlus className="size-4" aria-hidden="true" />
              Add guest details
            </Link>
            <p className="text-text-muted text-sm">
              This range is already blocked by the sync — for the guest
              portal link, ID upload and add-ons only. It won&apos;t block
              anything again, and if this range is actually more than one
              stay, add each one separately with its own dates.
            </p>
          </>
        ) : null}
      </div>
    </ResponsiveModal>
  );
}
