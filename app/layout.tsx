import type { Metadata } from "next";
import { Figtree, Fraunces } from "next/font/google";
import "./globals.css";

const figtree = Figtree({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

/**
 * Display face for headlines and the price figure. Without a second voice the
 * page reads as assembled rather than designed — every heading was the body
 * font at a larger size. One weight only, to stay inside the font budget.
 */
const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "Stays in Vrindavan",
    template: "%s | Stays in Vrindavan",
  },
  description:
    "Comfortable, well-kept apartments for your stay in Vrindavan. Book directly with the host.",
  // The app-wide default, reachable at every route with nothing more
  // specific. Deliberately set through the metadata object, not the
  // app/favicon.ico file-convention — that convention has documented
  // priority over generateMetadata() and would win regardless of what a
  // nested layout (e.g. the tenant layout, per-tenant favicon) returns,
  // which is exactly why a tenant's uploaded favicon never showed: both
  // rendered as separate <link> tags and the file-based one always took
  // precedence. Plain metadata fields shallow-merge instead — a nested
  // layout's `icons` cleanly replaces this one.
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${figtree.variable} ${fraunces.variable} h-full`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
