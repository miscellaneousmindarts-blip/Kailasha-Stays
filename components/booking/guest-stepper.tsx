"use client";

import { Minus, Plus } from "lucide-react";

export function GuestStepper({
  value,
  max,
  min = 1,
  onChange,
}: {
  value: number;
  max: number;
  min?: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-medium">Guests</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label="Decrease guests"
          className="border-border pressable flex size-11 items-center justify-center rounded-full border disabled:opacity-40"
        >
          <Minus className="size-4" aria-hidden="true" />
        </button>
        <span className="tabular w-6 text-center" aria-live="polite">
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label="Increase guests"
          className="border-border pressable flex size-11 items-center justify-center rounded-full border disabled:opacity-40"
        >
          <Plus className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
