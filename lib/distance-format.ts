/**
 * "1.4 km — 15 min walk" → { figure: "1.4 km", mode: "15 min walk" }.
 *
 * Splits on dashes only, never on spaces: "15 min walk" has to survive intact
 * when the owner wrote no distance at all, and a plain "10 minutes" with no
 * dash comes back as the figure with no mode line.
 *
 * Shared between the homepage's map strip and the property page's distances
 * block — both render the same "<owner's own value string>" format, and both
 * want the same big-figure/quiet-qualifier split.
 */
export function splitDistanceValue(value: string): { figure: string; mode: string | null } {
  const parts = value
    .split(/\s*[—–]\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
  return { figure: parts[0] ?? value, mode: parts[1] ?? null };
}
