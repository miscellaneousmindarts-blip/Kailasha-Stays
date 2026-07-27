const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function money(amount: number | null | undefined, currency = "INR") {
  if (amount === null || amount === undefined) return null;
  if (currency === "INR") return inr.format(amount);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** "2 guests · 1 bedroom · 1 bath" — the Airbnb-style facts line. */
export function capacityLine(p: {
  max_guests: number;
  bedrooms: number;
  bathrooms: number;
}) {
  const plural = (n: number, one: string, many = `${one}s`) =>
    `${n} ${n === 1 ? one : many}`;
  return [
    plural(p.max_guests, "guest"),
    plural(p.bedrooms, "bedroom"),
    plural(p.bathrooms, "bath"),
  ].join(" · ");
}

/** "9 Sep" — for tight rows where the weekday and year would force a truncation. */
export function formatDateShort(value: string | Date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
  }).format(typeof value === "string" ? new Date(value) : value);
}

export function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(typeof value === "string" ? new Date(value) : value);
}
