/**
 * Token resolution for homepage_sections content.
 *
 * Copy that currently interpolates a number in code (e.g. "Free cancellation
 * up to 7 days") is seeded as text containing a `{token}`, so the number stays
 * both editable in the admin AND correct wherever it's quoted — the trust
 * ribbon, the hero chips, the FAQ can all cite `{cancelDays}` without three
 * copies drifting apart.
 *
 * The emptiness rule is what stops a FAQ answer rendering as "about  from the
 * temple": if ANY token in a field resolves to empty, the whole field is
 * treated as empty. `buildFaq()` used to achieve this by returning `null` for
 * items with missing numbers; this reproduces it generically for every section.
 */

export type TokenCtx = Record<string, string | null | undefined>;

const TOKEN_RE = /\{([a-zA-Z]+)\}/g;

/**
 * Resolves every `{token}` in `text` against `ctx`. Returns `null` — not an
 * empty string — the moment any token comes back missing or blank, so the
 * caller can drop the field entirely rather than render a half-sentence.
 *
 * A token with no entry in `ctx` is treated as empty rather than throwing: a
 * seed typo or a future registry gap should degrade to "drop this field", the
 * same as a genuinely unset value, never crash a page render.
 */
export function resolveTokens(text: string | null | undefined, ctx: TokenCtx): string | null {
  if (!text) return null;
  let empty = false;

  const out = text.replace(TOKEN_RE, (_match, name: string) => {
    const value = ctx[name];
    if (value === null || value === undefined || value === "") {
      empty = true;
      return "";
    }
    return value;
  });

  if (empty) return null;
  const trimmed = out.trim();
  return trimmed || null;
}

/**
 * Same rule, applied PER PARAGRAPH for multi-paragraph fields (split on blank
 * lines), rather than to the whole field. `meet_host.body` is seeded as four
 * paragraphs, one of which is "My family has been here {hostYears} years." —
 * with a whole-field rule, an unset `host_years` would blank the entire
 * biography instead of dropping one sentence.
 *
 * Never returns null: an empty result here means "no paragraphs survived",
 * which callers render as no content, not as "use some other default" (there
 * is no other default any more — see plan §1).
 */
export function resolveProse(text: string | null | undefined, ctx: TokenCtx): string {
  if (!text) return "";
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => resolveTokens(p, ctx))
    .filter((p): p is string => p !== null);
  return paragraphs.join("\n\n");
}

/** Splits already-resolved prose back into paragraphs for rendering as `<p>` tags. */
export function paragraphsOf(resolved: string): string[] {
  return resolved
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}
