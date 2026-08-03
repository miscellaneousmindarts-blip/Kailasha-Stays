"use client";

import { MessageCircle } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SaveBar } from "@/components/admin/save-bar";
import { useSaveAction } from "@/components/admin/use-save-action";
import { updateSiteSettings } from "@/app/admin/(dashboard)/settings/actions";
import { whatsAppLink } from "@/lib/whatsapp";
import type { SiteSettings } from "@/lib/types/database";

export function ContactSettingsForm({ settings }: { settings: SiteSettings }) {
  const action = useSaveAction(updateSiteSettings);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        action.run(new FormData(e.currentTarget));
      }}
      className="max-w-xl space-y-5"
    >
      <div className="space-y-2">
        <Label htmlFor="business_name">Business name</Label>
        <Input
          id="business_name"
          name="business_name"
          defaultValue={settings.business_name}
          required
          className="h-11"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="whatsapp_number">WhatsApp number</Label>
        <Input
          id="whatsapp_number"
          name="whatsapp_number"
          defaultValue={settings.whatsapp_number ?? ""}
          placeholder="919876543210"
          className="h-11"
        />
        <p className="text-text-muted text-sm">
          Digits only, international format — no spaces or +. Drives every
          &quot;Book Direct&quot; button on the site; leave blank to hide direct
          booking until you&apos;re ready.
        </p>
        {settings.whatsapp_number ? (
          <a
            href={whatsAppLink(settings.whatsapp_number, "Test message from Admin Settings")}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
          >
            <MessageCircle className="size-4" aria-hidden="true" />
            Send a test message
          </a>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="contact_phone">Contact phone</Label>
          <Input
            id="contact_phone"
            name="contact_phone"
            defaultValue={settings.contact_phone ?? ""}
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact_email">Contact email</Label>
          <Input
            id="contact_email"
            name="contact_email"
            type="email"
            defaultValue={settings.contact_email ?? ""}
            className="h-11"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Textarea id="address" name="address" rows={2} defaultValue={settings.address ?? ""} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="response_note">Response note</Label>
        <Input
          id="response_note"
          name="response_note"
          placeholder="e.g. We reply within an hour, 8am–9pm"
          defaultValue={settings.response_note ?? ""}
          className="h-11"
        />
      </div>

      {/* Links live with the rest of the business identity rather than in
          their own section — they're the same kind of fact, and splitting
          them out was part of what made the old page five screens long. */}
      <div className="border-border space-y-5 border-t pt-5">
        <div className="space-y-2">
          <Label htmlFor="maps_url">Google Maps link</Label>
          <Input
            id="maps_url"
            name="maps_url"
            type="url"
            defaultValue={settings.maps_url ?? ""}
            placeholder="https://maps.app.goo.gl/…"
            className="h-11"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="instagram_url">Instagram</Label>
            <Input
              id="instagram_url"
              name="instagram_url"
              type="url"
              defaultValue={settings.instagram_url ?? ""}
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="facebook_url">Facebook</Label>
            <Input
              id="facebook_url"
              name="facebook_url"
              type="url"
              defaultValue={settings.facebook_url ?? ""}
              className="h-11"
            />
          </div>
        </div>
      </div>

      <SaveBar pending={action.pending} saved={action.saved} error={action.error} />
    </form>
  );
}
