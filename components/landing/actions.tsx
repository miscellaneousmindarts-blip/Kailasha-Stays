"use client";

import { MessageCircle, Phone, Share2 } from "lucide-react";

import { track } from "@/lib/track";

/**
 * WhatsApp on the landing page is always SECONDARY — outline only, never
 * filled, never larger than the saffron "View our homes" button. Two
 * co-equal CTAs split intent and lose both. The solid-fill treatment is
 * reserved for the property page, where WhatsApp is the primary action.
 */
export function WhatsAppLink({
  href,
  context,
  children,
  variant = "outline",
  className,
}: {
  href: string;
  context: string;
  children: React.ReactNode;
  variant?: "outline" | "text";
  className?: string;
}) {
  const base =
    variant === "outline"
      ? "border-whatsapp text-foreground hover:bg-whatsapp/10 border h-11 px-4 rounded-md"
      : "hover:underline underline-offset-2 min-h-11";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track("wa_click", { context })}
      className={`pressable inline-flex items-center justify-center gap-2 text-sm font-medium ${base} ${className ?? ""}`}
    >
      <MessageCircle className="size-4 shrink-0" aria-hidden="true" />
      {children}
    </a>
  );
}

export function PhoneLink({
  phone,
  context,
  className,
}: {
  phone: string;
  context: string;
  className?: string;
}) {
  return (
    <a
      href={`tel:${phone}`}
      onClick={() => track("call_click", { context })}
      className={`pressable inline-flex min-h-11 items-center gap-2 text-sm font-medium underline-offset-2 hover:underline ${className ?? ""}`}
    >
      <Phone className="size-4 shrink-0" aria-hidden="true" />
      {phone}
    </a>
  );
}

/**
 * The flat is approved on a family WhatsApp group before anyone books, so
 * forwarding is a real funnel stage rather than a social widget.
 */
export function ShareButton({
  location,
  summary,
  variant = "text",
  className,
}: {
  /** Where on the page this sits — reported as `share_click.location`. */
  location: string;
  summary: string;
  variant?: "text" | "button";
  className?: string;
}) {
  async function share() {
    track("share_click", { location });
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title: document.title, text: summary, url });
        return;
      } catch {
        // Cancelled, or the browser refused — fall through to WhatsApp so
        // the action never silently does nothing.
      }
    }
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`${summary}\n${url}`)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  const base =
    variant === "button"
      ? "border-border hover:bg-surface-subtle border h-11 px-4 rounded-md"
      : "underline-offset-2 hover:underline min-h-11";

  return (
    <button
      type="button"
      onClick={share}
      className={`pressable inline-flex items-center justify-center gap-2 text-sm font-medium ${base} ${className ?? ""}`}
    >
      <Share2 className="size-4 shrink-0" aria-hidden="true" />
      <span lang="hi">इसे परिवार को भेजें</span>
      {/* opacity rather than a fixed muted colour — this button sits on the
          dark hero scrim as well as on light bands, and a fixed grey fails
          contrast on the former. */}
      <span className="opacity-70">— Send to family</span>
    </button>
  );
}
