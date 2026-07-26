"use client";

import { BLOCK_TYPES, isKnownBlockType, type BlockContent } from "@/lib/blocks";
import type { PropertyImage } from "@/lib/types/database";

import { ParagraphEditor } from "./paragraph-editor";
import { ListEditor } from "./list-editor";
import { KeyValueEditor } from "./key-value-editor";
import { FaqEditor } from "./faq-editor";
import { ImageEditor } from "./image-editor";
import { GalleryEditor } from "./gallery-editor";
import { LinkListEditor } from "./link-list-editor";

/** The editing counterpart to components/blocks/section-renderer.tsx — one
 *  switch, one entry per block type. Adding a block type means adding a case
 *  here and in the public renderer, nothing else. */
export function BlockEditorSwitch({
  type,
  content,
  onSave,
  pending,
  error,
  saved,
  propertyImages,
}: {
  type: string;
  content: unknown;
  onSave: (content: unknown) => void;
  pending: boolean;
  error: string | null;
  saved: boolean;
  propertyImages: PropertyImage[];
}) {
  if (!isKnownBlockType(type)) {
    return (
      <p className="text-danger text-sm">
        Unknown block type &quot;{type}&quot;. Delete this section and add a
        new one.
      </p>
    );
  }

  // Deliberately NOT schema-validated here: a freshly added section starts
  // with placeholder content (e.g. an empty paragraph) that fails its own
  // schema's min-length rules until the admin fills it in — that's expected
  // mid-edit, not corruption. Each editor below defaults missing/empty
  // fields to a blank row itself. Validation happens for real at save time,
  // in updateSectionContent, and again in the public renderer.
  const safeContent = (content ?? BLOCK_TYPES[type].empty) as Record<string, unknown>;
  const common = { pending, error, saved };

  switch (type) {
    case "paragraph":
      return (
        <ParagraphEditor
          content={safeContent as BlockContent<"paragraph">}
          onSave={onSave}
          {...common}
        />
      );
    case "list":
      return (
        <ListEditor
          content={safeContent as BlockContent<"list">}
          onSave={onSave}
          {...common}
        />
      );
    case "key_value":
      return (
        <KeyValueEditor
          content={safeContent as BlockContent<"key_value">}
          onSave={onSave}
          {...common}
        />
      );
    case "faq":
      return (
        <FaqEditor
          content={safeContent as BlockContent<"faq">}
          onSave={onSave}
          {...common}
        />
      );
    case "image":
      return (
        <ImageEditor
          content={safeContent as BlockContent<"image">}
          onSave={onSave}
          propertyImages={propertyImages}
          {...common}
        />
      );
    case "gallery":
      return (
        <GalleryEditor
          content={safeContent as BlockContent<"gallery">}
          onSave={onSave}
          propertyImages={propertyImages}
          {...common}
        />
      );
    case "link_list":
      return (
        <LinkListEditor
          content={safeContent as BlockContent<"link_list">}
          onSave={onSave}
          {...common}
        />
      );
  }
}
