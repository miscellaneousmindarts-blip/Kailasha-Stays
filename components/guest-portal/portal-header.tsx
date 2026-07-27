import Image from "next/image";

import { formatDate } from "@/lib/format";
import { BLUR_DATA_URL, imageUrl } from "@/lib/images";
import type { GuestBookingBundle } from "@/lib/types/guest-portal";

export function PortalHeader({ bundle }: { bundle: GuestBookingBundle }) {
  const { booking, property } = bundle;
  const cover = property?.images[0];
  const src = imageUrl(cover?.storage_path);

  return (
    <header>
      <div className="bg-surface-subtle relative aspect-[16/9] overflow-hidden rounded-lg">
        {src ? (
          <Image
            src={src}
            alt={cover?.alt ?? property?.title ?? ""}
            fill
            sizes="100vw"
            priority
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
            className="object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(0,0,0,0.55)] via-transparent to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5 text-white">
          <p className="text-sm font-medium opacity-90">Your stay at</p>
          <h1 className="text-2xl font-semibold">{property?.title ?? "your property"}</h1>
        </div>
      </div>

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
