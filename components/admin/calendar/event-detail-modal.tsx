"use client";

import Link from "next/link";
import { ExternalLink, Loader2, Trash2 } from "lucide-react";

import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { useSaveAction } from "@/components/admin/use-save-action";
import { removeManualBlock } from "@/app/admin/(dashboard)/calendar/actions";
import { formatDate } from "@/lib/format";
import type { CalEvent } from "@/components/admin/calendar/admin-calendar";

const SOURCE_LABEL: Record<string, string> = {
  direct: "Direct booking",
  airbnb: "Airbnb",
  booking_com: "Booking.com",
  blocked: "Manual block",
  other: "Synced booking",
};

export function EventDetailModal({
  event,
  onClose,
  onRemoved,
}: {
  event: CalEvent;
  onClose: () => void;
  onRemoved: () => void;
}) {
  const remove = useSaveAction(removeManualBlock);

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

        {event.kind === "booking" && event.source === "blocked" && event.bookingId ? (
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
        ) : null}
        {remove.error ? (
          <p role="alert" className="text-danger text-sm">
            {remove.error}
          </p>
        ) : null}

        {event.kind === "external" ? (
          <p className="text-text-muted text-sm">
            Synced from an external calendar (Airbnb / Booking.com). Manage it
            from that platform directly.
          </p>
        ) : null}
      </div>
    </ResponsiveModal>
  );
}
