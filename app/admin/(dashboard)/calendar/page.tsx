import { AdminCalendar } from "@/components/admin/calendar/admin-calendar";
import { listPropertyOptions } from "@/lib/admin/queries";

export default async function AdminCalendarPage() {
  const properties = await listPropertyOptions();

  return (
    <div>
      <h1 className="text-2xl font-semibold">Calendar</h1>
      <p className="text-text-muted mt-1">
        Every source in one place — direct bookings, manual blocks, and
        synced Airbnb / Booking.com dates.
      </p>

      {properties.length === 0 ? (
        <div className="border-border mt-8 rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">No properties yet</p>
          <p className="text-text-muted mt-1 text-sm">
            Create a listing first, then its calendar appears here.
          </p>
        </div>
      ) : (
        <div className="mt-6">
          <AdminCalendar properties={properties} />
        </div>
      )}
    </div>
  );
}
