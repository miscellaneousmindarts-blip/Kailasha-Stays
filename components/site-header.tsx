import Image from "next/image";
import Link from "next/link";
import { MessageCircle } from "lucide-react";

import { homepageImageUrl } from "@/lib/images";
import type { PublicSiteBranding } from "@/lib/types/database";

/**
 * Sticky public header. Deliberately contains no link to /admin — the owner
 * reaches it by typing the URL (PLAN §5).
 */
export function SiteHeader({
  settings,
  basePath,
}: {
  settings: PublicSiteBranding;
  /** "" for the tenant served at the bare domain, "/s/{slug}" otherwise. */
  basePath: string;
}) {
  const logoSrc = homepageImageUrl(settings.logo_path);

  return (
    <header className="border-border sticky top-0 z-40 border-b bg-[rgba(255,255,255,0.85)] backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-3">
        {/* Allowed to shrink, and narrower below sm. With both this and the
            nav pinned at shrink-0 the row could not fit a 320px screen, so
            the page picked up ~20px of horizontal scroll — which also
            widened every `fixed inset-x-0` bar to match and pushed their
            right-hand content off-screen. */}
        <Link
          href={basePath || "/"}
          className="min-w-0"
          aria-label={`${settings.business_name} — home`}
        >
          {logoSrc ? (
            <span className="relative block h-9 w-[120px] max-w-full sm:w-[160px]">
              <Image
                src={logoSrc}
                alt={settings.business_name}
                fill
                sizes="(min-width: 640px) 160px, 120px"
                priority
                className="object-contain object-left"
              />
            </span>
          ) : (
            <span className="block truncate text-lg font-semibold tracking-tight">
              {settings.business_name}
            </span>
          )}
        </Link>

        <nav className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Link
            href={`${basePath}/properties`}
            className="hover:bg-surface-subtle pressable flex h-11 items-center rounded-md px-2 font-medium sm:px-3"
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
