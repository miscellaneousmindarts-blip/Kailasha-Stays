import Image from "next/image";

import type { BlockContent } from "@/lib/blocks";
import { BLUR_DATA_URL, imageUrl } from "@/lib/images";

export function GalleryBlock({ content }: { content: BlockContent<"gallery"> }) {
  const images = content.images
    .map((img) => ({ ...img, src: imageUrl(img.storage_path) }))
    .filter((img): img is typeof img & { src: string } => Boolean(img.src));

  if (!images.length) return null;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {images.map((img, i) => (
        <div
          key={i}
          className="bg-surface-subtle relative aspect-square overflow-hidden rounded-md"
        >
          <Image
            src={img.src}
            alt={img.alt ?? ""}
            fill
            sizes="(max-width: 768px) 50vw, 240px"
            className="object-cover"
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
          />
        </div>
      ))}
    </div>
  );
}
