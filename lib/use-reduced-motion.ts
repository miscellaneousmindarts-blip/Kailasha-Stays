"use client";

import { useSyncExternalStore } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(callback: () => void) {
  const mq = window.matchMedia(REDUCED_MOTION_QUERY);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}
function getSnapshot() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}
function getServerSnapshot() {
  // true, not false: a motion-sensitive visitor seeing something still for a
  // moment is the correct failure mode — the reverse (a moment of unwanted
  // motion before hydration catches up) is what this default rules out.
  return true;
}

/**
 * useSyncExternalStore, not useState+useEffect: matchMedia is genuinely
 * external, client-only state, which is exactly what this hook is for. It
 * avoids setting state synchronously inside an effect (flagged by this
 * project's lint rule) and a hydration mismatch from guessing at first paint.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
