import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { BlockContent } from "@/lib/blocks";

export function FaqBlock({ content }: { content: BlockContent<"faq"> }) {
  return (
    <Accordion type="single" collapsible className="max-w-2xl">
      {content.items.map((item, i) => (
        <AccordionItem key={i} value={`item-${i}`}>
          <AccordionTrigger className="py-4 text-left text-base font-medium">
            {item.q}
          </AccordionTrigger>
          <AccordionContent className="text-text-muted pb-4 text-base leading-relaxed">
            {item.a}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
