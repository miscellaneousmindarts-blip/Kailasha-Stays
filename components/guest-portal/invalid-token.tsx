import { MessageCircle, ShieldOff } from "lucide-react";

import { whatsAppLink } from "@/lib/whatsapp";
import type { SiteSettings } from "@/lib/types/database";

export function InvalidToken({ settings }: { settings: SiteSettings }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center p-6 text-center">
      <ShieldOff className="text-text-muted size-10" aria-hidden="true" />
      <h1 className="mt-4 text-xl font-semibold">This link isn&apos;t valid anymore</h1>
      <p className="text-text-muted mt-2 max-w-sm">
        It may have expired, or the booking may have changed. Message us and
        we&apos;ll help right away.
      </p>
      {settings.whatsapp_number ? (
        <a
          href={whatsAppLink(settings.whatsapp_number, "Hi, my stay portal link isn't working.")}
          target="_blank"
          rel="noopener noreferrer"
          className="pressable mt-6 flex h-12 items-center gap-2 rounded-md bg-[#25D366] px-6 font-medium text-white"
        >
          <MessageCircle className="size-5" aria-hidden="true" />
          Message us on WhatsApp
        </a>
      ) : null}
    </main>
  );
}
