import Link from "next/link";
import { MessageCircle } from "lucide-react";

import { getSiteSettings } from "@/lib/settings";

/**
 * Sticky public header. Deliberately contains no link to /admin — the owner
 * reaches it by typing the URL (PLAN §5).
 */
export async function SiteHeader() {
  const settings = await getSiteSettings();

  return (
    <header className="border-border sticky top-0 z-40 border-b bg-[rgba(255,255,255,0.85)] backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-3">
        <Link
          href="/"
          className="min-w-0 truncate text-lg font-semibold tracking-tight"
          aria-label={`${settings.business_name} — home`}
        >
          {settings.business_name}
        </Link>

        <nav className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Link
            href="/properties"
            className="hover:bg-surface-subtle pressable flex h-11 items-center rounded-md px-3 font-medium"
          >
            Properties
          </Link>
          {settings.whatsapp_number ? (
            <a
              href={`https://wa.me/${settings.whatsapp_number}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Chat with us on WhatsApp"
              className="border-border hover:bg-surface-subtle pressable flex h-11 items-center gap-2 rounded-md border px-3 font-medium"
            >
              <MessageCircle className="size-4 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">WhatsApp</span>
            </a>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
