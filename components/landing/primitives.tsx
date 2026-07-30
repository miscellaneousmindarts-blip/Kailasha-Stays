import Image from "next/image";

import { BLUR_DATA_URL } from "@/lib/images";
import type { ResolvedImage } from "@/lib/homepage";

/**
 * Renders a photo picked in the admin media library, or — until one is
 * chosen — a labelled box describing the shot that belongs there. The
 * placeholder deliberately uses the same surface tint and radius as the real
 * thing, so an unfinished page still reads as intentional rather than broken.
 */
export function Photo({
  image,
  brief,
  className,
  sizes,
  priority,
  aspect = "aspect-[4/3]",
  rounded = true,
}: {
  image: ResolvedImage | null;
  /** Shown in the placeholder box when no photo has been chosen yet. */
  brief?: string;
  className?: string;
  sizes: string;
  priority?: boolean;
  aspect?: string;
  /** Off for full-bleed grids, where rounded corners read as floating tiles. */
  rounded?: boolean;
}) {
  const radius = rounded ? "rounded-md" : "";

  if (!image) {
    return (
      <div
        className={`bg-surface-subtle border-border text-text-muted flex items-center justify-center border border-dashed p-4 text-center text-sm ${radius} ${aspect} ${className ?? ""}`}
      >
        <span>
          <span className="block font-medium">Photo needed</span>
          {brief}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`bg-surface-subtle relative overflow-hidden ${radius} ${aspect} ${className ?? ""}`}
    >
      <Image
        src={image.url}
        alt={image.alt}
        fill
        sizes={sizes}
        priority={priority}
        loading={priority ? undefined : "lazy"}
        placeholder="blur"
        blurDataURL={BLUR_DATA_URL}
        className="object-cover"
      />
      {/* Deliberately visible, including in production. This page argues "we
          photograph the parts other listings don't" — a stock bathroom
          shipping quietly under that heading would undo the whole thing. */}
      {image.isPlaceholder ? (
        <span className="bg-warning/95 text-warning-foreground absolute top-2 left-2 rounded-full px-2 py-0.5 text-[11px] font-medium">
          Sample photo
        </span>
      ) : null}
    </div>
  );
}

/**
 * Section shell. Bands alternate background → surface-subtle → background
 * only; `ink` is reserved for the single dark Shravan strip.
 */
export function Section({
  id,
  band = "canvas",
  className,
  children,
}: {
  id?: string;
  band?: "canvas" | "sand" | "ink";
  className?: string;
  children: React.ReactNode;
}) {
  const bands = {
    canvas: "bg-background",
    sand: "bg-surface-subtle",
    ink: "bg-foreground text-background",
  } as const;

  return (
    <section
      id={id}
      className={`${bands[band]} py-14 md:py-24 ${className ?? ""}`}
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
  if (!hi && !en) return null;
  return (
    <p className="text-primary text-xs font-semibold tracking-[0.14em] uppercase">
      {hi ? (
        <>
          <span lang="hi" className="tracking-normal normal-case">
            {hi}
          </span>
          {en ? <span aria-hidden="true"> · </span> : null}
        </>
      ) : null}
      {en}
    </p>
  );
}
