import Image from "next/image";

import type { BlockContent } from "@/lib/blocks";
import { BLUR_DATA_URL, imageUrl } from "@/lib/images";

export function ImageBlock({ content }: { content: BlockContent<"image"> }) {
  const src = imageUrl(content.storage_path);
  if (!src) return null;

  return (
    <figure className="max-w-3xl">
      <div className="bg-surface-subtle relative aspect-[3/2] overflow-hidden rounded-lg">
        <Image
          src={src}
          alt={content.alt ?? ""}
          fill
          sizes="(max-width: 768px) 100vw, 768px"
          className="object-cover"
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
        />
      </div>
      {content.caption ? (
        <figcaption className="text-text-muted mt-2 text-sm">
          {content.caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
