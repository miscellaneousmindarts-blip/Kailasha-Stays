import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";
import { buildICSFeed } from "@/lib/ical-build";

export const dynamic = "force-dynamic";

/**
 * Public iCal export feed for one property's direct bookings + manual
 * blocks — this is the URL the owner pastes into Airbnb's / Booking.com's
 * "import a calendar" setting. Protected by a shared secret query param
 * rather than a session, since Airbnb/Booking.com fetch it unauthenticated
 * on their own schedule.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> },
) {
  const { propertyId } = await params;
  const key = request.nextUrl.searchParams.get("key");

  if (key !== serverEnv.icalExportSecret) {
    return new NextResponse("Not found", { status: 404 });
  }

  const supabase = createAdminClient();

  const { data: property } = await supabase
    .from("properties")
    .select("title")
    .eq("id", propertyId)
    .maybeSingle();
  if (!property) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("id, check_in, check_out, source")
    .eq("property_id", propertyId)
    .in("source", ["direct", "blocked"])
    .in("status", ["confirmed", "completed"]);

  if (error) {
    return new NextResponse("Could not load bookings", { status: 500 });
  }

  const feed = buildICSFeed(property.title, bookings ?? []);

  return new NextResponse(feed, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${propertyId}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
