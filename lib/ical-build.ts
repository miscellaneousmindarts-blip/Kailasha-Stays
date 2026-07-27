/** Builds a valid RFC 5545 .ics feed for the export route — one all-day VEVENT per booking. */

function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

/** "2026-09-01" -> "20260901" (strip hyphens for the DATE value form). */
function toICSDate(isoDate: string): string {
  return isoDate.replace(/-/g, "");
}

function nowStamp(): string {
  return new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export type ExportableBooking = {
  id: string;
  check_in: string;
  check_out: string;
  source: string;
};

export function buildICSFeed(
  calendarName: string,
  bookings: ExportableBooking[],
): string {
  const stamp = nowStamp();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//" + escapeText(calendarName) + "//Direct Bookings//EN",
    "CALSCALE:GREGORIAN",
    "X-WR-CALNAME:" + escapeText(calendarName),
  ];

  for (const b of bookings) {
    const summary = b.source === "blocked" ? "Blocked" : "Reserved";
    lines.push(
      "BEGIN:VEVENT",
      `UID:${b.id}@direct-booking`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${toICSDate(b.check_in)}`,
      `DTEND;VALUE=DATE:${toICSDate(b.check_out)}`,
      `SUMMARY:${escapeText(summary)}`,
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  // RFC 5545 requires CRLF line endings.
  return lines.join("\r\n") + "\r\n";
}
