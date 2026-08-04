import Image from "next/image";

import { BLUR_DATA_URL, imageUrl } from "@/lib/images";
import { splitDistanceValue } from "@/lib/distance-format";
import type { BlockContent } from "@/lib/blocks";

/**
 * Distances to nearby landmarks as a photo bento — this page's counterpart to
 * the homepage's "Where you'll be" tiles, and deliberately styled the same
 * way (numbered ghost numeral, scrim + overlay text on a photo, plain
 * typographic tile without one) so the two don't read as two different
 * products bolted together.
 *
 * One layout per count rather than a generic N-column grid: a bento's whole
 * appeal is an intentional hierarchy, and a hierarchy that has to work for
 * both 3 items and 5 looks accidental at one of the two. Every layout leads
 * with item 0 — the admin's first row is the nearest or most important
 * landmark, same convention as the homepage.
 */

type Item = BlockContent<"distances">["items"][number];

/**
 * Per-tile span classes, one array per supported count. `lg` tiles get the
 * full numeral/figure/mode treatment; `sm` tiles (only ever the four
 * satellites in the 5-up layout) get a smaller scale so a 1-column-wide tile
 * doesn't overflow.
 */
const LAYOUTS: Record<number, { className: string; size: "lg" | "sm" }[]> = {
  1: [{ className: "col-span-2 md:col-span-4 min-h-[220px] md:min-h-[280px]", size: "lg" }],
  2: [
    { className: "col-span-1 md:col-span-2 min-h-[200px] md:min-h-[240px]", size: "lg" },
    { className: "col-span-1 md:col-span-2 min-h-[200px] md:min-h-[240px]", size: "lg" },
  ],
  3: [
    { className: "col-span-2 min-h-[200px] md:col-span-2 md:row-span-2", size: "lg" },
    { className: "col-span-1 min-h-[150px] md:col-span-2 md:row-span-1", size: "lg" },
    { className: "col-span-1 min-h-[150px] md:col-span-2 md:row-span-1", size: "lg" },
  ],
  4: [
    { className: "col-span-2 min-h-[200px] md:col-span-2 md:row-span-3", size: "lg" },
    { className: "col-span-1 min-h-[130px] md:col-span-2 md:row-span-1", size: "lg" },
    { className: "col-span-1 min-h-[130px] md:col-span-2 md:row-span-1", size: "lg" },
    { className: "col-span-2 min-h-[130px] md:col-span-2 md:row-span-1", size: "lg" },
  ],
  5: [
    { className: "col-span-2 min-h-[220px] md:col-span-2 md:row-span-2", size: "lg" },
    { className: "col-span-1 min-h-[130px] md:col-span-1 md:row-span-1", size: "sm" },
    { className: "col-span-1 min-h-[130px] md:col-span-1 md:row-span-1", size: "sm" },
    { className: "col-span-1 min-h-[130px] md:col-span-1 md:row-span-1", size: "sm" },
    { className: "col-span-1 min-h-[130px] md:col-span-1 md:row-span-1", size: "sm" },
  ],
};

/**
 * Row height per count — a MINIMUM via minmax(), not a fixed size. A fixed
 * auto-rows value clips nothing on its own, but a tile whose content (a
 * two-line label, a wide figure) needs more room than that fixed track
 * still grows to fit it — grid doesn't stretch a fixed-length track for a
 * tall item, so the tile's own box spills past its track and overlaps
 * whatever sits in the row below. minmax(min, auto) keeps the same compact
 * height when content fits, and lets the row grow instead of the tile
 * overflowing when it doesn't.
 */
const AUTO_ROWS: Record<number, string> = {
  1: "",
  2: "",
  3: "auto-rows-[minmax(150px,auto)] md:auto-rows-[minmax(170px,auto)]",
  4: "auto-rows-[minmax(130px,auto)] md:auto-rows-[minmax(135px,auto)]",
  5: "auto-rows-[minmax(140px,auto)] md:auto-rows-[minmax(160px,auto)]",
};

export function DistancesBlock({ content }: { content: BlockContent<"distances"> }) {
  const items = content.items.slice(0, 5);
  if (!items.length) return null;

  const layout = LAYOUTS[items.length];
  const autoRows = AUTO_ROWS[items.length];

  return (
    <div className={`grid grid-cols-2 gap-3 md:grid-cols-4 ${autoRows}`}>
      {items.map((item, i) => (
        <DistanceTile key={i} item={item} index={i} {...layout[i]} />
      ))}
    </div>
  );
}

function DistanceTile({
  item,
  index,
  className,
  size,
}: {
  item: Item;
  index: number;
  className: string;
  size: "lg" | "sm";
}) {
  const { figure, mode } = splitDistanceValue(item.value);
  const photoSrc = imageUrl(item.image?.storage_path ?? null);
  // The first tile leads even without a photo, so the grid always has one
  // focal point — matches the homepage bento's convention exactly.
  const onDark = Boolean(photoSrc) || index === 0;

  const numeralSize = size === "sm" ? "text-[52px] md:text-[64px]" : "text-[86px] md:text-[104px]";
  const labelSize = size === "sm" ? "text-[13px]" : "text-[15px]";
  const figureSize = size === "sm" ? "text-[19px] md:text-[22px]" : "text-[24px] md:text-[30px]";
  const modeSize = size === "sm" ? "text-xs" : "text-sm";
  const padding = size === "sm" ? "p-3" : "p-4 md:p-5";

  return (
    <div
      className={`relative isolate flex flex-col justify-end overflow-hidden rounded-xl border ${padding} ${className} ${
        onDark
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-surface-subtle"
      }`}
    >
      {photoSrc ? (
        <>
          <Image
            src={photoSrc}
            alt={item.image?.alt ?? item.label}
            fill
            sizes={size === "sm" ? "25vw" : "(min-width: 768px) 50vw, 100vw"}
            loading="lazy"
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
            className="-z-10 object-cover"
          />
          {/* Two layers, not one: these tiles are wider than they are tall
              (or, for the N=5 satellites, roughly square), so a single
              bottom-up scrim dark enough for the figure swallows the whole
              photo. Stacking a vertical and a horizontal gradient darkens
              only the bottom-left corner where the type sits. */}
          <span
            aria-hidden="true"
            className="absolute inset-0 -z-10 block"
            style={{
              backgroundImage:
                "linear-gradient(to top, rgba(33,26,20,0.88) 0%, rgba(33,26,20,0.30) 68%, rgba(33,26,20,0.10) 100%)," +
                "linear-gradient(to right, rgba(33,26,20,0.65) 0%, rgba(33,26,20,0.10) 68%, rgba(33,26,20,0) 100%)",
            }}
          />
        </>
      ) : null}

      {/* Ties the tile to its rank, and gives a photo-less tile some depth. */}
      <span
        aria-hidden="true"
        className={`font-display pointer-events-none absolute -top-2 right-2 leading-none font-semibold ${numeralSize} ${
          photoSrc ? "text-white/[0.16]" : onDark ? "text-white/[0.10]" : "text-foreground/[0.07]"
        }`}
      >
        {index + 1}
      </span>

      <h3 className={`relative font-medium ${labelSize} leading-snug ${onDark ? "" : "text-foreground"}`}>
        {item.label}
      </h3>
      <p
        className={`font-display tabular relative mt-1 leading-none font-semibold ${figureSize} ${
          onDark ? "text-primary-tint" : "text-foreground"
        }`}
      >
        {figure}
      </p>
      {mode ? (
        <p className={`relative mt-1 ${modeSize} ${onDark ? "text-[rgba(253,251,247,0.78)]" : "text-text-muted"}`}>
          {mode}
        </p>
      ) : null}
    </div>
  );
}
