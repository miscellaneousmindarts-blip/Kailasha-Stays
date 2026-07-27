import { notFound } from "next/navigation";

import { getBookingForEdit } from "@/lib/admin/queries";
import { BookingDetail } from "@/components/admin/booking-detail";
import { publicEnv } from "@/lib/env";

export default async function BookingDetailPage(
  props: PageProps<"/admin/bookings/[id]">,
) {
  const { id } = await props.params;
  const booking = await getBookingForEdit(id);
  if (!booking) notFound();

  return <BookingDetail booking={booking} siteUrl={publicEnv.siteUrl} />;
}
