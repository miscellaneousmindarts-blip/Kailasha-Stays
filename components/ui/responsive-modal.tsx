"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

/**
 * The dialog/sheet shell used across the site (PLAN §8.2/§8.3): scale+fade
 * centered dialog on desktop, a bottom sheet with a drag-to-dismiss handle on
 * mobile. One shared implementation so every modal in the app animates and
 * dismisses the same way.
 */
export function ResponsiveModal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startY: number; dy: number } | null>(null);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    drag.current = { startY: e.clientY, dy: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current || !sheetRef.current) return;
    const dy = Math.max(0, e.clientY - drag.current.startY);
    drag.current.dy = dy;
    sheetRef.current.style.transform = `translateY(${dy}px)`;
  }

  function onPointerUp() {
    const d = drag.current;
    const sheet = sheetRef.current;
    drag.current = null;
    if (!d || !sheet) return;

    sheet.style.transition = "transform 200ms cubic-bezier(0.22,1,0.36,1)";
    if (d.dy > 120) {
      sheet.style.transform = "translateY(100%)";
      window.setTimeout(onClose, 180);
    } else {
      sheet.style.transform = "translateY(0)";
      window.setTimeout(() => {
        if (sheet) sheet.style.transition = "";
      }, 220);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-[rgba(10,10,10,0.5)] duration-200 animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="bg-surface shadow-overlay relative flex max-h-[92vh] w-full flex-col rounded-t-2xl duration-250 animate-in slide-in-from-bottom sm:max-w-lg sm:rounded-lg sm:duration-200 sm:fade-in sm:zoom-in-95"
      >
        <div
          className="flex shrink-0 touch-none items-center justify-center py-3 sm:hidden"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <div className="bg-border h-1.5 w-10 rounded-full" aria-hidden="true" />
        </div>

        <div className="border-border flex shrink-0 items-center justify-between border-b px-5 py-4 sm:pt-5">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="hover:bg-surface-subtle pressable -mr-2 flex size-11 items-center justify-center rounded-full"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>
  );
}
