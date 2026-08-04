import Link from "next/link";
import Image from "next/image";
import { Plus } from "lucide-react";

import { listAllProperties } from "@/lib/admin/queries";
import { imageUrl } from "@/lib/images";
import { pickCover } from "@/lib/media";
import { money } from "@/lib/format";

const STATUS_STYLES: Record<string, string> = {
  published: "bg-success/15 text-success",
  draft: "bg-warning/15 text-warning",
  archived: "bg-muted text-text-muted",
};

export default async function AdminListingsPage() {
  const properties = await listAllProperties();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Listings</h1>
        <Link
          href="/admin/listings/new"
          className="bg-primary text-primary-foreground hover:bg-primary-hover pressable flex h-11 items-center gap-2 rounded-md px-4 font-medium"
        >
          <Plus className="size-4" aria-hidden="true" />
          New listing
        </Link>
      </div>

      {properties.length === 0 ? (
        <div className="border-border mt-8 rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">No listings yet</p>
          <p className="text-text-muted mt-1 text-sm">
            Create your first property to get started.
          </p>
        </div>
      ) : (
        <ul className="border-border divide-border mt-6 divide-y rounded-lg border">
          {properties.map((p) => {
            const cover = pickCover(p.property_images);
            const src = imageUrl(cover?.storage_path);
            return (
              <li key={p.id}>
                <Link
                  href={`/admin/listings/${p.id}`}
                  className="hover:bg-surface-subtle pressable flex items-center gap-4 p-4"
                >
                  <div className="bg-surface-subtle relative size-14 shrink-0 overflow-hidden rounded-md">
                    {src ? (
                      <Image src={src} alt="" fill sizes="56px" className="object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{p.title}</p>
                    <p className="text-text-muted truncate text-sm">
                      {[p.area, p.city].filter(Boolean).join(", ")}
                      {p.base_price ? ` · ${money(p.base_price, p.currency)}/night` : ""}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${STATUS_STYLES[p.status] ?? "bg-muted"}`}
                  >
                    {p.status}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
