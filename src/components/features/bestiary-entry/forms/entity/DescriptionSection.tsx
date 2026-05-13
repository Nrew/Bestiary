import { Controller, useFormContext } from "react-hook-form";
import { FormSection } from "@/components/forms/FormSection";
import { RichTextEditor } from "@/components/shared/RichTextEditor";
import { DeferredMount } from "@/components/shared/DeferredMount";
import { Skeleton } from "@/components/ui/skeleton";
import type { Entity } from "@/types";

// TipTap + extensions are deferred until idle or near-viewport so the edit
// transition stays responsive; skeleton matches editor min-height + toolbar.
const RICH_TEXT_FALLBACK = (
  <Skeleton variant="shimmer" className="min-h-49.5 w-full rounded-md" aria-hidden />
);

// Scoped to one field via Controller so unrelated form changes don't reconcile
// the TipTap editor: the dominant cost during form mount and typing.
export function DescriptionSection() {
  const { control } = useFormContext<Entity>();

  return (
    <FormSection title="Description" iconCategory="game" iconName="source-book">
      <Controller
        control={control}
        name="description"
        render={({ field }) => (
          <DeferredMount
            ref={field.ref}
            className="col-span-full"
            fallback={RICH_TEXT_FALLBACK}
          >
            <RichTextEditor
              ariaLabel="Entity description"
              content={field.value || ""}
              onChange={(html) => field.onChange(html)}
              onBlur={field.onBlur}
            />
          </DeferredMount>
        )}
      />
    </FormSection>
  );
}

export function NotesSection() {
  const { control } = useFormContext<Entity>();

  return (
    <FormSection title="Research Notes" iconCategory="ui" iconName="book">
      <Controller
        control={control}
        name="notes"
        render={({ field }) => (
          <DeferredMount
            ref={field.ref}
            className="col-span-full"
            fallback={RICH_TEXT_FALLBACK}
          >
            <RichTextEditor
              ariaLabel="Research notes"
              content={field.value || ""}
              onChange={(html) => field.onChange(html)}
              onBlur={field.onBlur}
            />
          </DeferredMount>
        )}
      />
    </FormSection>
  );
}
