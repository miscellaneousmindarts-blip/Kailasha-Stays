/**
 * Normalizes an Indian mobile number to "91XXXXXXXXXX" (digits only, the same
 * format wa.me and site_settings.whatsapp_number use). Returns null if the
 * input isn't a valid 10-digit Indian mobile number.
 */
export function normalizeIndianPhone(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (digits.startsWith("91") && digits.length === 12) digits = digits.slice(2);
  if (digits.length !== 10 || !/^[6-9]\d{9}$/.test(digits)) return null;
  return `91${digits}`;
}

/** "91XXXXXXXXXX" -> "XXXXX XXXXX" for display. */
export function formatIndianPhone(e164: string): string {
  const local = e164.startsWith("91") ? e164.slice(2) : e164;
  if (local.length !== 10) return e164;
  return `${local.slice(0, 5)} ${local.slice(5)}`;
}
