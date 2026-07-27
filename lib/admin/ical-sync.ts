import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { parseICS } from "@/lib/ical";

export type SyncResult = {
  sourceId: string;
  success: boolean;
  imported: number;
  error?: string;
};

/**
 * Fetches one calendar_sources row's iCal URL, upserts its events into
 * external_events, and deletes rows whose UID no longer appears in the feed
 * — that's how cancellations on the other platform propagate here. Always
 * uses the service-role client: this runs both from an authenticated admin
 * action ("Sync now") and from the unauthenticated, secret-protected cron
 * route, so it can't rely on a user session.
 */
export async function syncCalendarSource(sourceId: string): Promise<SyncResult> {
  const supabase = createAdminClient();

  const { data: source } = await supabase
    .from("calendar_sources")
    .select("*")
    .eq("id", sourceId)
    .maybeSingle();

  if (!source) {
    return { sourceId, success: false, imported: 0, error: "Calendar source not found." };
  }

  try {
    const res = await fetch(source.ical_url, {
      signal: AbortSignal.timeout(20_000),
      headers: { "User-Agent": "bnb-website-calendar-sync/1.0" },
    });
    if (!res.ok) {
      throw new Error(`Feed returned HTTP ${res.status}`);
    }
    const text = await res.text();
    const events = parseICS(text);

    const { data: existing } = await supabase
      .from("external_events")
      .select("id, uid")
      .eq("source_id", sourceId);

    const seenUids = new Set(events.map((e) => e.uid));
    const staleIds = (existing ?? [])
      .filter((row) => !seenUids.has(row.uid))
      .map((row) => row.id);

    if (events.length > 0) {
      const { error: upsertError } = await supabase.from("external_events").upsert(
        events.map((e) => ({
          property_id: source.property_id,
          source_id: sourceId,
          uid: e.uid,
          start_date: e.startDate,
          end_date: e.endDate,
          summary: e.summary,
          synced_at: new Date().toISOString(),
        })),
        { onConflict: "source_id,uid" },
      );
      if (upsertError) throw new Error(upsertError.message);
    }

    if (staleIds.length > 0) {
      await supabase.from("external_events").delete().in("id", staleIds);
    }

    await supabase
      .from("calendar_sources")
      .update({ last_synced_at: new Date().toISOString(), last_status: "ok", last_error: null })
      .eq("id", sourceId);

    return { sourceId, success: true, imported: events.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed.";
    await supabase
      .from("calendar_sources")
      .update({ last_synced_at: new Date().toISOString(), last_status: "error", last_error: message })
      .eq("id", sourceId);
    return { sourceId, success: false, imported: 0, error: message };
  }
}

export async function syncAllCalendarSources(): Promise<SyncResult[]> {
  const supabase = createAdminClient();
  const { data: sources } = await supabase.from("calendar_sources").select("id");
  if (!sources?.length) return [];
  return Promise.all(sources.map((s) => syncCalendarSource(s.id)));
}
