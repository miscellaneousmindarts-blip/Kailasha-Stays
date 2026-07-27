import { BookingsList } from "@/components/admin/bookings-list";
import { listBookings, listPropertyOptions } from "@/lib/admin/queries";

export default async function AdminBookingsPage() {
  const [bookings, properties] = await Promise.all([
    listBookings(),
    listPropertyOptions(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Bookings</h1>
      <p className="text-text-muted mt-1">
        Direct bookings, manual blocks, and (once synced) Airbnb / Booking.com
        reservations.
      </p>

      <div className="mt-6">
        <BookingsList bookings={bookings} properties={properties} />
      </div>
    </div>
  );
}
