import { RichTextViewer } from "@/components/shared/RichTextViewer";
import { hasRichTextContent } from "@/lib/empty";
import type { BestiaryEntry } from "@/types";

export function OverviewSection({
  data,
}: { data: BestiaryEntry }) {
  if (!hasRichTextContent(data.description)) return null;

  return (
    <div className="max-w-none viewer-prose font-serif">
      <RichTextViewer html={data.description} />
    </div>
  );
}
