"use client";

import { useState } from "react";

type Result = { error?: string; success?: boolean } | void;

/**
 * Wraps a server action call with pending/error/saved state. Our server
 * actions take whatever arguments make sense for each mutation (propertyId +
 * formData, propertyId + id + direction, ...), so this just forwards args
 * rather than assuming the fixed (prevState, formData) shape useActionState
 * requires.
 */
export function useSaveAction<Args extends unknown[]>(
  action: (...args: Args) => Promise<Result>,
) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  /** Awaits completion and reports success/failure — for callers that need
   *  to react right where the call happens (e.g. collapse a form on success). */
  async function runAndWait(...args: Args): Promise<boolean> {
    setPending(true);
    setError(null);
    setSaved(false);
    const result = await action(...args);
    setPending(false);

    if (result && "error" in result && result.error) {
      setError(result.error);
      return false;
    }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
    return true;
  }

  /** Fire-and-forget version for simple click/submit handlers. */
  function run(...args: Args) {
    void runAndWait(...args);
  }

  return { run, runAndWait, pending, error, saved };
}
