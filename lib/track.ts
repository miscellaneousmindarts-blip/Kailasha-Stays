"use client";

/**
 * Pushes an event to the GTM dataLayer, creating it if no tag has loaded yet.
 * No-ops safely with no analytics installed, so instrumentation can ship
 * before the tag does.
 *
 * Conversion spans two pages here — landing → property → WhatsApp — so the
 * stages are tracked as separate events (`property_click`, then `wa_click`).
 * Rolling them into one number would hide which stage is leaking.
 */
type TrackParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    dataLayer?: TrackParams[];
  }
}

export function track(event: string, params: TrackParams = {}) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({ event, ...params });
}
