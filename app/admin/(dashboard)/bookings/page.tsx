import Link from "next/link";
import { Plus } from "lucide-react";

import { BookingsList } from "@/components/admin/bookings-list";
import { listBookings, listPropertyOptions } from "@/lib/admin/queries";

export default async function AdminBookingsPage() {
  const [bookings, properties] = await Promise.all([
    listBookings(),
    listPropertyOptions(),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Bookings</h1>
          <p className="text-text-muted mt-1">
            Direct bookings, manual blocks, and (once synced) Airbnb /
            Booking.com reservations.
          </p>
        </div>
        <Link
          href="/admin/bookings/new"
          className="bg-primary text-primary-foreground hover:bg-primary-hover pressable flex h-11 shrink-0 items-center gap-2 rounded-md px-4 font-medium"
        >
          <Plus className="size-4" aria-hidden="true" />
          New booking
        </Link>
      </div>

      <div className="mt-6">
        <BookingsList bookings={bookings} properties={properties} />
      </div>
    </div>
  );
}
