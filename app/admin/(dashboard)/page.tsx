import Link from "next/link";
import { ArrowRight, Home } from "lucide-react";

import { listAllProperties } from "@/lib/admin/queries";

export default async function AdminDashboardPage() {
  const properties = await listAllProperties();
  const published = properties.filter((p) => p.status === "published").length;
  const drafts = properties.filter((p) => p.status === "draft").length;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-text-muted mt-1">
        An overview of bookings and enquiries lands here as the site grows.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="border-border rounded-lg border p-4">
          <p className="text-text-muted text-sm">Properties</p>
          <p className="tabular mt-1 text-2xl font-semibold">
            {properties.length}
          </p>
        </div>
        <div className="border-border rounded-lg border p-4">
          <p className="text-text-muted text-sm">Published</p>
          <p className="tabular mt-1 text-2xl font-semibold">{published}</p>
        </div>
        <div className="border-border rounded-lg border p-4">
          <p className="text-text-muted text-sm">Drafts</p>
          <p className="tabular mt-1 text-2xl font-semibold">{drafts}</p>
        </div>
      </div>

      <Link
        href="/admin/listings"
        className="border-border hover:bg-surface-subtle pressable mt-6 flex h-12 items-center justify-between rounded-md border px-4 font-medium"
      >
        <span className="flex items-center gap-2">
          <Home className="size-4" aria-hidden="true" />
          Manage listings
        </span>
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </div>
  );
}
