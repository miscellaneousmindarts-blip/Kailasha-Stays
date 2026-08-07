import { notFound } from "next/navigation";

import { getBookingForEdit } from "@/lib/admin/queries";
import { BookingDetail } from "@/components/admin/booking-detail";
import { requireTenant } from "@/lib/admin/auth";
import { tenantOrigin } from "@/lib/tenant";

export default async function BookingDetailPage(
  props: PageProps<"/admin/bookings/[id]">,
) {
  const { id } = await props.params;
  const { tenant } = await requireTenant();
  const booking = await getBookingForEdit(id);
  if (!booking) notFound();

  // tenantOrigin, not tenantSiteUrl: /stay/[token] is a global route that
  // resolves its own tenant from the booking token, so it is never under the
  // /s/{slug} prefix. What it does need is the tenant's own host, so a guest
  // opening their booking link stays on the business they booked with.
  return <BookingDetail booking={booking} siteUrl={tenantOrigin(tenant)} />;
}
