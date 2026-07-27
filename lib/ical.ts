/**
 * A small, dependency-free parser for the iCal (.ics) feeds Airbnb and
 * Booking.com export — just enough of RFC 5545 to handle their real-world
 * output: folded lines, VALUE=DATE and DATE-TIME timestamps, and escaped
 * text. Not a general-purpose iCal library.
 */

export type ParsedEvent = {
  uid: string;
  /** yyyy-MM-dd, inclusive */
  startDate: string;
  /** yyyy-MM-dd, exclusive (iCal DTEND convention — matches our own bookings table) */
  endDate: string;
  summary: string | null;
};

/** RFC 5545: a line starting with a space or tab continues the previous line. */
function unfoldLines(text: string): string[] {
  const rawLines = text.split(/\r\n|\n|\r/);
  const lines: string[] = [];
  for (const line of rawLines) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && lines.length > 0) {
      lines[lines.length - 1] += line.slice(1);
    } else if (line.trim() !== "") {
      lines.push(line);
    }
  }
  return lines;
}

function unescapeText(value: string): string {
  return value
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

/** "20260901" or "20260901T000000Z" -> "2026-09-01" (local calendar date, no timezone shift). */
function toDateString(raw: string): string | null {
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits.length < 8) return null;
  const y = digits.slice(0, 4);
  const m = digits.slice(4, 6);
  const d = digits.slice(6, 8);
  return `${y}-${m}-${d}`;
}

type Field = { name: string; params: string; value: string };

function parseLine(line: string): Field | null {
  const colonIndex = line.indexOf(":");
  if (colonIndex === -1) return null;
  const left = line.slice(0, colonIndex);
  const value = line.slice(colonIndex + 1);
  const [name, ...paramParts] = left.split(";");
  return { name: name.toUpperCase(), params: paramParts.join(";"), value };
}

export function parseICS(icsText: string): ParsedEvent[] {
  const lines = unfoldLines(icsText);
  const events: ParsedEvent[] = [];

  let inEvent = false;
  let uid: string | null = null;
  let startDate: string | null = null;
  let endDate: string | null = null;
  let summary: string | null = null;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (trimmed === "BEGIN:VEVENT") {
      inEvent = true;
      uid = null;
      startDate = null;
      endDate = null;
      summary = null;
      continue;
    }
    if (trimmed === "END:VEVENT") {
      if (inEvent && uid && startDate && endDate && endDate > startDate) {
        events.push({ uid, startDate, endDate, summary });
      }
      inEvent = false;
      continue;
    }
    if (!inEvent) continue;

    const field = parseLine(trimmed);
    if (!field) continue;

    switch (field.name) {
      case "UID":
        uid = field.value.trim();
        break;
      case "DTSTART":
        startDate = toDateString(field.value);
        break;
      case "DTEND":
        endDate = toDateString(field.value);
        break;
      case "SUMMARY":
        summary = unescapeText(field.value.trim()) || null;
        break;
    }
  }

  return events;
}
