import { parseBlock, type BlockContent } from "@/lib/blocks";
import type { PropertySection } from "@/lib/types/database";

import { ParagraphBlock } from "./paragraph-block";
import { ListBlock } from "./list-block";
import { KeyValueBlock } from "./key-value-block";
import { DistancesBlock } from "./distances-block";
import { FaqBlock } from "./faq-block";
import { ImageBlock } from "./image-block";
import { GalleryBlock } from "./gallery-block";
import { LinkListBlock } from "./link-list-block";

type SectionLike = Pick<PropertySection, "id" | "title" | "type" | "content">;

/**
 * The single switch every admin-composed section goes through — public page,
 * guest portal and admin preview all render via this component, so a new block
 * type appears everywhere at once.
 *
 * Unknown or malformed blocks render nothing rather than breaking the page.
 */
function BlockBody({ type, content }: { type: string; content: unknown }) {
  const block = parseBlock(type, content);
  if (!block) return null;

  switch (block.type) {
    case "paragraph":
      return <ParagraphBlock content={block.content as BlockContent<"paragraph">} />;
    case "list":
      return <ListBlock content={block.content as BlockContent<"list">} />;
    case "key_value":
      return <KeyValueBlock content={block.content as BlockContent<"key_value">} />;
    case "distances":
      return <DistancesBlock content={block.content as BlockContent<"distances">} />;
    case "faq":
      return <FaqBlock content={block.content as BlockContent<"faq">} />;
    case "image":
      return <ImageBlock content={block.content as BlockContent<"image">} />;
    case "gallery":
      return <GalleryBlock content={block.content as BlockContent<"gallery">} />;
    case "link_list":
      return <LinkListBlock content={block.content as BlockContent<"link_list">} />;
  }
}

export function SectionRenderer({ section }: { section: SectionLike }) {
  const body = BlockBody({ type: section.type, content: section.content });
  if (!body) return null;

  return (
    <section className="border-border border-t py-8 first:border-t-0 md:py-10">
      {section.title ? (
        <h2 className="mb-4 text-xl md:text-[1.375rem]">{section.title}</h2>
      ) : null}
      {body}
    </section>
  );
}

export function SectionList({ sections }: { sections: SectionLike[] }) {
  if (!sections.length) return null;
  return (
    <>
      {sections.map((s) => (
        <SectionRenderer key={s.id} section={s} />
      ))}
    </>
  );
}
