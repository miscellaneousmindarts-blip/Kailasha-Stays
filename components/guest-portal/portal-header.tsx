import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, ExternalLink } from "lucide-react";

import { formatDate } from "@/lib/format";
import { BLUR_DATA_URL, imageUrl } from "@/lib/images";
import type { GuestBookingBundle } from "@/lib/types/guest-portal";

const STATUS_COPY: Record<string, { title: string; subtitle: string }> = {
  confirmed: {
    title: "Booking confirmed",
    subtitle: "We look forward to hosting you.",
  },
  completed: {
    title: "Stay completed",
    subtitle: "Thank you for staying with us.",
  },
};

export function PortalHeader({ bundle }: { bundle: GuestBookingBundle }) {
  const { booking, property } = bundle;
  const cover = property?.images[0];
  const src = imageUrl(cover?.storage_path);
  const status = STATUS_COPY[booking.status] ?? STATUS_COPY.confirmed;

  return (
    <header>
      {/* The single most important fact on this page, first thing seen —
          not a badge tucked into a corner of the photo below. */}
      <div className="bg-success/10 border-success/25 flex items-center gap-3 rounded-lg border p-4">
        <CheckCircle2 className="text-success size-6 shrink-0" aria-hidden="true" />
        <div>
          <p className="text-success font-semibold">
            {status.title}
            {booking.guest_name ? `, ${booking.guest_name.split(" ")[0]}` : ""}
          </p>
          <p className="text-text-muted text-sm">{status.subtitle}</p>
        </div>
      </div>

      {property ? (
        <Link
          href={`/properties/${property.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="group bg-surface-subtle relative mt-4 block aspect-[16/9] overflow-hidden rounded-lg"
        >
          {src ? (
            <Image
              src={src}
              alt={cover?.alt ?? property.title}
              fill
              sizes="100vw"
              priority
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
              className="object-cover transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-[rgba(0,0,0,0.6)] via-[rgba(0,0,0,0.05)] to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5 text-white">
            <div className="min-w-0">
              <p className="text-sm font-medium opacity-90">Your stay at</p>
              <h1 className="truncate text-2xl font-semibold">{property.title}</h1>
            </div>
            <span className="pressable flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-[rgba(255,255,255,0.15)] px-3 text-sm font-medium backdrop-blur-sm group-hover:bg-[rgba(255,255,255,0.25)]">
              View listing
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </span>
          </div>
        </Link>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        {booking.guest_name ? (
          <span className="font-medium">{booking.guest_name}</span>
        ) : null}
        <span className="text-text-muted">
          {formatDate(booking.check_in)} – {formatDate(booking.check_out)}
        </span>
        <span className="text-text-muted">
          {booking.nights} {booking.nights === 1 ? "night" : "nights"}
        </span>
        {booking.guests ? (
          <span className="text-text-muted">
            {booking.guests} {booking.guests === 1 ? "guest" : "guests"}
          </span>
        ) : null}
      </div>
    </header>
  );
}
