import Image from "next/image";
import Link from "next/link";
import { ExternalLink, MapPin, Star } from "lucide-react";

import { capacityLine, money } from "@/lib/format";
import { BLUR_DATA_URL, imageUrl } from "@/lib/images";
import { pickCover } from "@/lib/media";
import type { PropertyCardData } from "@/lib/queries";

export function PropertyCard({
  property,
  basePath,
  href,
  priority = false,
  distance,
  hostName,
  airbnb,
}: {
  property: PropertyCardData;
  /** "" for the tenant served at the bare domain, "/s/{slug}" otherwise.
   *  Ignored when `href` is given. */
  basePath?: string;
  /** Full override for the card's link, e.g. "/stays/{publicSlug}" on the
   *  apex — that route has no "/properties/" segment, so it can't be built
   *  from `basePath` the way the tenant page's cards are. Takes priority
   *  over basePath entirely when set. */
  href?: string;
  priority?: boolean;
  /** "1.4 km · 15 min walk" — only the apex homes grid passes this today;
   *  /properties omits it, since a tenant's own page doesn't need to repeat
   *  the temple distance the property page itself already states. */
  distance?: string | null;
  /** "Hosted by {business_name}" — apex-only, same reasoning as `distance`:
   *  a tenant's own /properties page already IS that host, so naming them
   *  again on every card would be redundant there. */
  hostName?: string | null;
  /** Renders "Also on Airbnb · ★ 4.9 (32 reviews)" when both rating and
   *  reviewCount are set, or just "Also on Airbnb" when only the link is
   *  known. Omitted entirely with no `airbnb` prop. */
  airbnb?: { url: string; rating: number | null; reviewCount: number | null } | null;
}) {
  const cover = pickCover(property.property_images);
  const src = imageUrl(cover?.storage_path);
  const price = money(property.base_price, property.currency);

  const linkHref = href ?? `${basePath ?? ""}/properties/${property.slug}`;

  return (
    <div className="group">
      <Link href={linkHref} className="block">
        {/* plain tint, not .skeleton — this is the real image's backdrop while it
            decodes, and must not shimmer indefinitely behind a loaded photo */}
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

          {distance ? (
            <p className="text-text-muted mt-1 flex items-center gap-1 text-sm">
              <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
              {distance}
            </p>
          ) : null}

          {hostName ? (
            <p className="text-text-muted mt-0.5 text-sm">Hosted by {hostName}</p>
          ) : (
            <p className="text-text-muted mt-0.5 text-sm">
              {[property.area, property.city].filter(Boolean).join(", ")}
            </p>
          )}

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

      {airbnb ? (
        <a
          href={airbnb.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-text-muted hover:text-foreground pressable mt-1.5 inline-flex min-h-6 items-center gap-1 text-xs"
        >
          Also on Airbnb
          {airbnb.rating !== null && airbnb.reviewCount !== null ? (
            <span className="tabular inline-flex items-center gap-0.5">
              <span aria-hidden="true">·</span>
              <Star className="size-3 fill-current" aria-hidden="true" />
              {airbnb.rating.toFixed(1)} ({airbnb.reviewCount})
            </span>
          ) : null}
          <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
        </a>
      ) : null}
    </div>
  );
}

export function PropertyCardSkeleton() {
  return (
    <div>
      <div className="skeleton aspect-[4/3] rounded-lg" />
      <div className="mt-3 space-y-2">
        <div className="skeleton h-5 w-3/4 rounded-sm" />
        <div className="skeleton h-4 w-1/2 rounded-sm" />
        <div className="skeleton h-4 w-2/5 rounded-sm" />
      </div>
    </div>
  );
}
