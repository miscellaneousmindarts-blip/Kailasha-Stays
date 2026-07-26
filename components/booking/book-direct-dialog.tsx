"use client";

import { useId, useState } from "react";
import { CheckCircle2, Loader2, MessageCircle } from "lucide-react";

import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/format";
import { nightsBetween, toISODate } from "@/lib/date-utils";
import { normalizeIndianPhone } from "@/lib/phone";
import { buildEnquiryMessage, whatsAppLink } from "@/lib/whatsapp";
import type { AddonServiceData } from "@/lib/queries";

export function BookDirectDialog({
  open,
  onClose,
  propertyId,
  propertyTitle,
  checkIn,
  checkOut,
  guests,
  addons,
  whatsappNumber,
}: {
  open: boolean;
  onClose: () => void;
  propertyId: string;
  propertyTitle: string;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  addons: AddonServiceData[];
  whatsappNumber: string;
}) {
  const formId = useId();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [waLink, setWaLink] = useState<string | null>(null);

  const nights = nightsBetween(checkIn, checkOut);
  const normalizedPhone = normalizeIndianPhone(phone);
  const phoneInvalid = phoneTouched && phone.trim() !== "" && !normalizedPhone;

  function toggleAddon(id: string) {
    setAddonIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function handleClose() {
    onClose();
    // reset after the close animation so the form is fresh next time it opens
    window.setTimeout(() => {
      setName("");
      setPhone("");
      setMessage("");
      setAddonIds([]);
      setPhoneTouched(false);
      setFormError(null);
      setWaLink(null);
    }, 250);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError("Please enter your name.");
      return;
    }
    const e164 = normalizeIndianPhone(phone);
    if (!e164) {
      setPhoneTouched(true);
      setFormError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const { data: enquiryId, error } = await supabase.rpc("create_enquiry", {
        p_property_id: propertyId,
        p_name: name.trim(),
        p_phone: e164,
        p_check_in: toISODate(checkIn),
        p_check_out: toISODate(checkOut),
        p_guests: guests,
        p_addon_ids: addonIds,
        p_message: message.trim() || null,
      });

      if (error) throw error;

      const addonNames = addons
        .filter((a) => addonIds.includes(a.id))
        .map((a) => a.name);
      const msg = buildEnquiryMessage({
        propertyTitle,
        checkIn,
        checkOut,
        guests,
        addonNames,
        name: name.trim(),
        enquiryId: enquiryId as string,
      });
      const link = whatsAppLink(whatsappNumber, msg);
      setWaLink(link);
      window.open(link, "_blank", "noopener,noreferrer");
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again or message us directly.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ResponsiveModal open={open} onClose={handleClose} title="Book directly">
      {waLink ? (
        <div className="flex flex-col items-center py-4 text-center">
          <div className="animate-[--animate-rise-in]">
            <CheckCircle2 className="text-success size-12" aria-hidden="true" />
          </div>
          <p className="mt-4 text-lg font-semibold">Your enquiry is sent</p>
          <p className="text-text-muted mt-1 max-w-xs">
            We&apos;ll confirm your booking on WhatsApp shortly.
          </p>
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="pressable mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#25D366] px-6 font-medium text-white"
          >
            <MessageCircle className="size-5" aria-hidden="true" />
            Open WhatsApp
          </a>
          <button
            type="button"
            onClick={handleClose}
            className="text-text-muted hover:text-foreground pressable mt-3 flex h-11 items-center px-4 text-sm"
          >
            Close
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="bg-surface-subtle rounded-md p-4 text-sm">
            <p className="font-medium">{propertyTitle}</p>
            <p className="text-text-muted mt-1">
              {formatDate(checkIn)} – {formatDate(checkOut)} · {nights}{" "}
              {nights === 1 ? "night" : "nights"} · {guests}{" "}
              {guests === 1 ? "guest" : "guests"}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${formId}-name`}>Your name</Label>
            <Input
              id={`${formId}-name`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${formId}-phone`}>Mobile number</Label>
            <Input
              id={`${formId}-phone`}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={() => setPhoneTouched(true)}
              aria-invalid={phoneInvalid}
              aria-describedby={phoneInvalid ? `${formId}-phone-error` : undefined}
              placeholder="98765 43210"
              required
              className="h-11"
            />
            {phoneInvalid ? (
              <p
                id={`${formId}-phone-error`}
                role="alert"
                className="text-danger text-sm"
              >
                Enter a valid 10-digit mobile number.
              </p>
            ) : null}
          </div>

          {addons.length ? (
            <div className="space-y-2">
              <p className="font-medium">Add-on services</p>
              <div className="border-border divide-border divide-y rounded-md border">
                {addons.map((addon) => {
                  const checked = addonIds.includes(addon.id);
                  return (
                    <label
                      key={addon.id}
                      className="hover:bg-surface-subtle flex min-h-14 cursor-pointer items-start gap-3 px-3 py-3"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleAddon(addon.id)}
                        className="mt-0.5"
                      />
                      <span className="flex-1">
                        <span className="block text-sm font-medium">
                          {addon.name}
                        </span>
                        {addon.price ? (
                          <span className="text-text-muted block text-sm">
                            ₹{addon.price.toLocaleString("en-IN")}{" "}
                            {addon.price_unit}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor={`${formId}-message`}>
              Message <span className="text-text-muted font-normal">(optional)</span>
            </Label>
            <Textarea
              id={`${formId}-message`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Anything else we should know?"
            />
          </div>

          {formError ? (
            <p role="alert" className="text-danger text-sm">
              {formError}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="bg-primary text-primary-foreground hover:bg-primary-hover pressable flex h-12 w-full items-center justify-center gap-2 rounded-md font-medium disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Opening WhatsApp…
              </>
            ) : (
              "Send enquiry on WhatsApp"
            )}
          </button>
          <p className="text-text-muted text-center text-sm">
            No payment now — confirm on WhatsApp.
          </p>
        </form>
      )}
    </ResponsiveModal>
  );
}
