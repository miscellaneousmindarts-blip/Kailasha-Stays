import Image from "next/image";
import Link from "next/link";

import { capacityLine, money } from "@/lib/format";
import { BLUR_DATA_URL, imageUrl } from "@/lib/images";
import type { PropertyCardData } from "@/lib/queries";

export function PropertyCard({
  property,
  priority = false,
}: {
  property: PropertyCardData;
  priority?: boolean;
}) {
  const cover =
    property.property_images.find((i) => i.is_cover) ??
    property.property_images[0];
  const src = imageUrl(cover?.storage_path);
  const price = money(property.base_price, property.currency);

  return (
    <Link href={`/properties/${property.slug}`} className="group block">
      <div className="bg-surface-subtle relative aspect-[4/3] overflow-hidden rounded-lg">
        {src ? (
          <Image
            src={src}
            alt={cover?.alt ?? property.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 380px"
            priority={priority}
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
            className="object-cover transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
          />
        ) : null}
      </div>

      <div className="mt-3">
        <h3 className="group-hover:text-primary font-semibold transition-colors">
          {property.title}
        </h3>
        <p className="text-text-muted mt-0.5 text-sm">
          {[property.area, property.city].filter(Boolean).join(", ")}
        </p>
        <p className="text-text-muted mt-0.5 text-sm">
          {capacityLine(property)}
        </p>
        {price ? (
          <p className="mt-2">
            <span className="tabular font-semibold">{price}</span>
            <span className="text-text-muted"> / night</span>
          </p>
        ) : null}
      </div>
    </Link>
  );
}

export function PropertyCardSkeleton() {
  return (
    <div>
      <div className="bg-surface-subtle animate-[--animate-shimmer] aspect-[4/3] rounded-lg" />
      <div className="mt-3 space-y-2">
        <div className="bg-surface-subtle h-5 w-3/4 rounded-sm" />
        <div className="bg-surface-subtle h-4 w-1/2 rounded-sm" />
        <div className="bg-surface-subtle h-4 w-2/5 rounded-sm" />
      </div>
    </div>
  );
}
