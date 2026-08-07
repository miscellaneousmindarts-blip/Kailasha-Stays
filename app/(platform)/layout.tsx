import type { Metadata } from "next";

/**
 * The platform's own identity — not any tenant's. Overrides the root
 * layout's "Stays in Vrindavan" default the same way the tenant layout
 * (app/(public)/s/[tenant]/layout.tsx) overrides it per tenant; this is the
 * third identity now sharing the root layout, for the apex itself.
 */
export const metadata: Metadata = {
  // `absolute`, not a plain string: a plain string is a %s slot the ROOT
  // layout's "%s | Stays in Vrindavan" template would still wrap around —
  // exactly the leak the tenant layout already had to guard against the
  // same way. `absolute` is the one form no ancestor template touches.
  title: { absolute: "Deoghar BnB — direct-booking sites for homestay owners" },
  description:
    "We build and host direct-booking websites for homestay and guesthouse owners near Baba Baidyanath Dham, Deoghar.",
};

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="flex flex-1 flex-col">{children}</div>;
}
