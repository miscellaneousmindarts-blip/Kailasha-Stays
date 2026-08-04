import type { Metadata } from "next";

import { NewBookingForm } from "./new-booking-form";
import {
  listAddonsByProperty,
  listPropertyOptions,
  listPropertyPricing,
} from "@/lib/admin/queries";

export const metadata: Metadata = { title: "New booking" };

export default async function NewBookingPage() {
  const [properties, pricing, addonsByProperty] = await Promise.all([
    listPropertyOptions(),
    listPropertyPricing(),
    listAddonsByProperty(),
  ]);

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold">New booking</h1>
      <p className="text-text-muted mt-1">
        For a guest who booked outside the platform — WhatsApp, phone, or in
        person. This creates a confirmed booking and a guest portal link,
        exactly like converting an enquiry.
      </p>

      {properties.length === 0 ? (
        <div className="border-border mt-8 rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">No listings yet</p>
          <p className="text-text-muted mt-1 text-sm">
            Create a property first, then you can book it here.
          </p>
        </div>
      ) : (
        <div className="mt-6">
          <NewBookingForm
            properties={properties}
            pricing={pricing}
            addonsByProperty={addonsByProperty}
          />
        </div>
      )}
    </div>
  );
}
