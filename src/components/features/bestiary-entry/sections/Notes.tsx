import { ViewSection } from "../components/ViewSection";
import { RichTextViewer } from "@/components/shared/RichTextViewer";
import { hasRichTextContent } from "@/lib/empty";
import type { BestiaryEntry } from "@/types";

export function NotesSection({ data }: { data: BestiaryEntry }) {
  const notes = "notes" in data ? data.notes : undefined;

  if (!hasRichTextContent(notes)) return null;

  return (
    <ViewSection
      title="Research Notes"
      iconCategory="entity"
      iconName="spellbook"
    >
      <div className="p-4 sm:p-6 rounded-lg relative border-l-4 border-note-edge bg-note-surface shadow-[inset_2px_2px_8px_var(--color-ink-10),2px_2px_5px_var(--color-ink-20)]">
        <div className="max-w-none font-serif viewer-prose">
          <RichTextViewer html={notes} />
        </div>
      </div>
    </ViewSection>
  );
}
