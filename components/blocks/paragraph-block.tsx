import type { BlockContent } from "@/lib/blocks";

export function ParagraphBlock({
  content,
}: {
  content: BlockContent<"paragraph">;
}) {
  return (
    <div className="max-w-prose space-y-4 text-[1.0625rem] leading-relaxed">
      {content.text.split(/\n\s*\n/).map((para, i) => (
        <p key={i}>{para}</p>
      ))}
    </div>
  );
}
