import Image from "next/image";
import { ArrowRight, Check } from "lucide-react";

import { Section } from "@/components/landing/primitives";
import { BLUR_DATA_URL, imageUrl } from "@/lib/images";
import { layoutSchemas, type LayoutType } from "@/lib/homepage-blocks";

/**
 * Renderers for admin-composed sections.
 *
 * Content arrives already validated by getHomepageLayout, but each renderer
 * parses again so it can work from typed data instead of `unknown` casts. A
 * second parse of a small object is free next to the network round-trips this
 * page already makes.
 *
 * These stay inside the page's existing type scale and token set on purpose.
 * An admin adding a section should get something that looks like it belongs,
 * not a visitor from a different design system.
 */

type ImageRef = { storage_path: string; alt?: string | null } | null | undefined;

function Figure({
  image,
  className,
  sizes,
  priority = false,
}: {
  image: ImageRef;
  className?: string;
  sizes: string;
  priority?: boolean;
}) {
  const src = imageUrl(image?.storage_path ?? null);
  if (!src) return null;
  return (
    <Image
      src={src}
      alt={image?.alt ?? ""}
      fill
      sizes={sizes}
      loading={priority ? undefined : "lazy"}
      priority={priority}
      placeholder="blur"
      blurDataURL={BLUR_DATA_URL}
      className={`object-cover ${className ?? ""}`}
    />
  );
}

/** Body copy the admin typed. Blank lines become paragraphs; nothing else is interpreted. */
function Prose({ text, tone = "muted" }: { text?: string | null; tone?: "muted" | "invert" }) {
  const paras = (text ?? "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (!paras.length) return null;

  return (
    <div
      className={`mt-4 space-y-3 text-[17px] leading-relaxed md:text-[19px] ${
        tone === "invert" ? "text-[rgba(253,251,247,0.82)]" : "text-text-muted"
      }`}
    >
      {paras.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}

function SplitSection({ content }: { content: unknown }) {
  const parsed = layoutSchemas.split.safeParse(content);
  if (!parsed.success) return null;
  const { band, heading, body, bullets, image, imageSide } = parsed.data;
  const hasImage = Boolean(imageUrl(image?.storage_path ?? null));

  return (
    <Section band={band}>
      <div className={`grid items-center gap-8 ${hasImage ? "md:grid-cols-2 md:gap-12" : ""}`}>
        {hasImage ? (
          <div
            className={`bg-surface-subtle relative aspect-[4/3] overflow-hidden rounded-xl ${
              imageSide === "right" ? "md:order-2" : ""
            }`}
          >
            <Figure image={image} sizes="(min-width: 768px) 50vw, 100vw" />
          </div>
        ) : null}

        <div className={hasImage ? "" : "max-w-2xl"}>
          <h2 className="font-display text-[26px] leading-[1.15] font-semibold md:text-[34px]">
            {heading}
          </h2>
          <Prose text={body} tone={band === "ink" ? "invert" : "muted"} />

          {bullets.length ? (
            <ul className="mt-5 space-y-2.5">
              {bullets.map((b) => (
                <li key={b} className="flex items-start gap-2.5">
                  <Check className="text-success mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span className={band === "ink" ? "text-[rgba(253,251,247,0.9)]" : ""}>{b}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </Section>
  );
}

function FeatureBandSection({ content }: { content: unknown }) {
  const parsed = layoutSchemas.feature_band.safeParse(content);
  if (!parsed.success) return null;
  const { heading, body, image, ctaLabel, ctaHref } = parsed.data;

  return (
    <section className="bg-foreground relative isolate overflow-hidden">
      <Figure
        image={image}
        sizes="100vw"
        className="-z-10 opacity-[0.42]"
      />
      {/* Fixed scrim regardless of the photo, so the copy's contrast never
          depends on which image the admin picked. */}
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-10 block bg-[rgba(33,26,20,0.62)]"
      />
      <div className="container-page py-16 md:py-24">
        <div className="max-w-[620px]">
          <h2 className="font-display text-[28px] leading-[1.1] font-semibold text-white md:text-[38px]">
            {heading}
          </h2>
          <Prose text={body} tone="invert" />
          {ctaLabel && ctaHref ? (
            <a
              href={ctaHref}
              className="bg-primary text-primary-foreground hover:bg-primary-hover pressable mt-7 inline-flex h-12 items-center gap-2 rounded-md px-6 font-medium"
            >
              {ctaLabel}
              <ArrowRight className="size-4" aria-hidden="true" />
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function BentoSection({ content }: { content: unknown }) {
  const parsed = layoutSchemas.bento.safeParse(content);
  if (!parsed.success) return null;
  const { band, heading, tiles } = parsed.data;

  return (
    <Section band={band}>
      {heading ? (
        <h2 className="font-display mb-6 max-w-2xl text-[26px] leading-[1.15] font-semibold md:mb-8 md:text-[34px]">
          {heading}
        </h2>
      ) : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map((tile, i) => {
          const hasImage = Boolean(imageUrl(tile.image?.storage_path ?? null));
          const dark = tile.tone === "dark" || hasImage;

          return (
            <div
              key={i}
              className={`relative isolate flex min-h-[168px] flex-col justify-end overflow-hidden rounded-xl border p-5 md:min-h-[200px] ${
                tile.wide ? "col-span-2" : ""
              } ${
                dark
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-surface-subtle"
              }`}
            >
              {hasImage ? (
                <>
                  <Figure image={tile.image} sizes="(min-width: 768px) 50vw, 100vw" className="-z-10" />
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 -z-10 block bg-[linear-gradient(to_top,rgba(33,26,20,0.90)_0%,rgba(33,26,20,0.45)_60%,rgba(33,26,20,0.15)_100%)]"
                  />
                </>
              ) : null}

              <h3
                className={`font-display text-[19px] leading-snug font-semibold md:text-[22px] ${
                  dark ? "text-white" : ""
                }`}
              >
                {tile.heading}
              </h3>
              {tile.body ? (
                <p
                  className={`mt-1.5 text-sm leading-relaxed ${
                    dark ? "text-[rgba(255,255,255,0.80)]" : "text-text-muted"
                  }`}
                >
                  {tile.body}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </Section>
  );
}

function StatRowSection({ content }: { content: unknown }) {
  const parsed = layoutSchemas.stat_row.safeParse(content);
  if (!parsed.success) return null;
  const { band, heading, stats } = parsed.data;

  return (
    <Section band={band}>
      {heading ? (
        <h2 className="font-display mb-8 max-w-2xl text-[26px] leading-[1.15] font-semibold md:text-[34px]">
          {heading}
        </h2>
      ) : null}

      <dl className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label}>
            <dd className="font-display tabular text-[34px] leading-none font-semibold md:text-[46px]">
              {s.figure}
            </dd>
            <dt className="mt-2 text-[15px] font-medium">{s.label}</dt>
            {s.note ? <p className="text-text-muted mt-1 text-sm">{s.note}</p> : null}
          </div>
        ))}
      </dl>
    </Section>
  );
}

function QuoteSection({ content }: { content: unknown }) {
  const parsed = layoutSchemas.quote.safeParse(content);
  if (!parsed.success) return null;
  const { band, quote, attribution, role } = parsed.data;

  return (
    <Section band={band}>
      <figure className="max-w-3xl">
        <blockquote className="font-display text-[24px] leading-[1.3] font-semibold md:text-[34px]">
          {/* Real typographic quotes, not the straight ASCII the admin's
              keyboard produces. */}
          &ldquo;{quote}&rdquo;
        </blockquote>
        {attribution ? (
          <figcaption className="text-text-muted mt-5 text-sm">
            <span className="text-foreground font-medium">{attribution}</span>
            {role ? ` · ${role}` : ""}
          </figcaption>
        ) : null}
      </figure>
    </Section>
  );
}

export function CustomSection({
  type,
  content,
}: {
  type: LayoutType;
  content: unknown;
}) {
  switch (type) {
    case "split":
      return <SplitSection content={content} />;
    case "feature_band":
      return <FeatureBandSection content={content} />;
    case "bento":
      return <BentoSection content={content} />;
    case "stat_row":
      return <StatRowSection content={content} />;
    case "quote":
      return <QuoteSection content={content} />;
  }
}
