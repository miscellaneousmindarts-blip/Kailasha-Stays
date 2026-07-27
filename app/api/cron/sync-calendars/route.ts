import { NextResponse, type NextRequest } from "next/server";

import { serverEnv } from "@/lib/env";
import { syncAllCalendarSources } from "@/lib/admin/ical-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Scheduled sync of every calendar_sources row, run every 30 minutes by a
 * pg_cron job (see supabase/migrations/0002_calendar_sync_cron.sql) calling
 * this route via pg_net with the CRON_SECRET bearer token. Authorization is
 * a shared secret rather than a session, since this is triggered by Postgres,
 * not a logged-in admin.
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${serverEnv.cronSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const results = await syncAllCalendarSources();
  return NextResponse.json({ synced: results.length, results });
}
