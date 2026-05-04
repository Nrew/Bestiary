import React from "react";
import { RichTextViewer } from "@/components/shared/RichTextViewer";
import { hasRichTextContent } from "@/lib/empty";
import type { BestiaryEntry } from "@/types";

export const OverviewSection: React.FC<{ data: BestiaryEntry }> = ({
  data,
}) => {
  if (!hasRichTextContent(data.description)) return null;

  return (
    <div className="prose prose-lg dark:prose-invert max-w-none viewer-prose font-serif">
      <RichTextViewer html={data.description} />
    </div>
  );
};
