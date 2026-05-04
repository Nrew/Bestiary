import React from "react";
import { useFormContext } from "react-hook-form";
import { FormSection } from "@/components/forms/FormSection";
import { RichTextEditor } from "@/components/shared/RichTextEditor";
import type { Entity } from "@/types";

export const DescriptionSection: React.FC = () => {
  const { watch, setValue } = useFormContext<Entity>();

  return (
    <FormSection title="Description" iconCategory="game" iconName="source-book">
      <div className="col-span-full">
        <RichTextEditor
          content={watch("description") || ""}
          onChange={(html) => setValue("description", html, { shouldDirty: true })}
        />
      </div>
    </FormSection>
  );
};

export const NotesSection: React.FC = () => {
  const { watch, setValue } = useFormContext<Entity>();

  return (
    <FormSection title="Research Notes" iconCategory="ui" iconName="book">
      <div className="col-span-full">
        <RichTextEditor
          content={watch("notes") || ""}
          onChange={(html) => setValue("notes", html, { shouldDirty: true })}
        />
      </div>
    </FormSection>
  );
};
