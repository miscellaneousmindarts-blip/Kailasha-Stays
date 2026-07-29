import Image from "next/image";

import { BLUR_DATA_URL, imageUrl } from "@/lib/images";
import type { LandingImage } from "@/lib/landing-config";

/**
 * Renders a configured photo, or — until the owner supplies one — a labelled
 * box describing the shot that belongs there. The placeholder deliberately
 * uses the same surface tint and radius as the real thing, so an unfinished
 * page still reads as intentional rather than broken.
 */
export function ConfiguredImage({
  image,
  className,
  sizes,
  priority,
  aspect = "aspect-[4/3]",
}: {
  image: LandingImage;
  className?: string;
  sizes: string;
  priority?: boolean;
  aspect?: string;
}) {
  const src = imageUrl(image.path);

  if (!src) {
    return (
      <div
        className={`bg-surface-subtle border-border text-text-muted flex items-center justify-center rounded-md border border-dashed p-4 text-center text-sm ${aspect} ${className ?? ""}`}
      >
        <span>
          <span className="block font-medium">Photo needed</span>
          {image.brief}
        </span>
      </div>
    );
  }

  return (
    <div className={`bg-surface-subtle relative overflow-hidden rounded-md ${aspect} ${className ?? ""}`}>
      <Image
        src={src}
        alt={image.alt}
        fill
        sizes={sizes}
        priority={priority}
        loading={priority ? undefined : "lazy"}
        placeholder="blur"
        blurDataURL={BLUR_DATA_URL}
        className="object-cover"
      />
    </div>
  );
}

/**
 * Section shell. Bands alternate background → surface-subtle → background
 * only; `night` is reserved for the single dark Shravan strip.
 */
export function Section({
  id,
  band = "canvas",
  className,
  children,
}: {
  id?: string;
  band?: "canvas" | "sand";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={`${band === "sand" ? "bg-surface-subtle" : "bg-background"} py-14 md:py-24 ${className ?? ""}`}
    >
      <div className="container-page">{children}</div>
    </section>
  );
}

export function Eyebrow({
  hi,
  en,
}: {
  /** Hindi carries feeling; English carries specifications. */
  hi?: string;
  en: string;
}) {
  return (
    <p className="text-primary text-xs font-semibold tracking-[0.14em] uppercase">
      {hi ? (
        <>
          <span lang="hi" className="tracking-normal normal-case">
            {hi}
          </span>
          <span aria-hidden="true"> · </span>
        </>
      ) : null}
      {en}
    </p>
  );
}
