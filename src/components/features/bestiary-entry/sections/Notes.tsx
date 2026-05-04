import React from "react";
import { ViewSection } from "../components/ViewSection";
import { RichTextViewer } from "@/components/shared/RichTextViewer";
import { hasRichTextContent } from "@/lib/empty";
import type { BestiaryEntry } from "@/types";

export const NotesSection: React.FC<{ data: BestiaryEntry }> = ({ data }) => {
  const notes = "notes" in data ? data.notes : undefined;

  if (!hasRichTextContent(notes)) return null;

  return (
    <ViewSection
      title="Research Notes"
      iconCategory="entity"
      iconName="spellbook"
    >
      <div
        className="p-4 sm:p-6 rounded-lg relative border-l-4"
        style={{
          backgroundColor: "hsl(45, 40%, 90%)", // Slightly darker parchment
          borderColor: "hsl(35, 30%, 75%)",
          boxShadow:
            "inset 2px 2px 8px hsl(30, 20%, 10%, 0.1), 2px 2px 5px hsl(0,0%,0%,0.2)",
        }}
      >
        <div className="prose prose-lg max-w-none font-serif viewer-prose">
          <RichTextViewer html={notes} />
        </div>
      </div>
    </ViewSection>
  );
};
