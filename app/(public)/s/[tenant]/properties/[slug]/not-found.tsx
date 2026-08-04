"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SearchX } from "lucide-react";

/**
 * A client component only so it can read its own path. not-found.tsx never
 * receives route params, so there is no other way to know whose site the
 * visitor is on — and sending them to a different owner's property list from
 * a 404 is exactly the sort of small leak that makes a white-label product
 * feel like someone else's.
 */
export default function NotFound() {
  const pathname = usePathname();
  const match = pathname.match(/^\/s\/([^/]+)/);
  const basePath = match ? `/s/${match[1]}` : "";

  return (
    <main className="container-page flex flex-1 flex-col items-center justify-center py-24 text-center">
      <SearchX className="text-text-muted size-8" aria-hidden="true" />
      <h1 className="mt-4 text-2xl">We couldn&apos;t find that property</h1>
      <p className="text-text-muted mt-2 max-w-sm">
        It may have been removed, or the link might be incomplete.
      </p>
      <Link
        href={`${basePath}/properties`}
        className="bg-primary text-primary-foreground hover:bg-primary-hover pressable mt-6 inline-flex h-12 items-center rounded-md px-6 font-medium"
      >
        See all properties
      </Link>
    </main>
  );
}
