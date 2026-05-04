import React from "react";
import { useFormContext } from "react-hook-form";
import { FormSection } from "@/components/forms/FormSection";
import {
  FormInput,
  FormSelect,
  FormStatValueInput,
  FormTagInput,
  FormColorPicker,
} from "@/components/forms/FormPrimitives";
import { CustomPropertiesFields } from "@/components/forms/FormCollections";
import { RichTextEditor } from "@/components/shared/RichTextEditor";
import type { Status } from "@/types";

const STATUS_CUSTOM_SUGGESTIONS: Record<string, string> = {
  transformationTarget: "Transformation Target",
  linkedCondition: "Linked Condition",
  relatedEntity: "Related Entity",
  sourceAbility: "Source Ability",
};

const STATUS_ENTITY_KEYS = new Set([
  "transformationTarget",
  "linkedCondition",
  "relatedEntity",
]);

export const StatusForm: React.FC = React.memo(() => {
  const {
    watch,
    setValue,
  } = useFormContext<Status>();

  const stackingOptions = [
    { value: "no", label: "Does Not Stack" },
    { value: "refresh", label: "Refresh Duration" },
    { value: "stack", label: "Stack (Intensify)" },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <FormSection title="Status Details" iconCategory="condition" iconName="poisoned">
        <FormInput<Status> name="name" label="Name" placeholder="Poisoned" autoFocus />

        <FormInput<Status>
          name="shortTag"
          label="Short Tag"
          placeholder="poisoned"
          description="Unique identifier for this status"
        />

        <FormColorPicker<Status>
          name="color"
          label="Color"
          description="Display color for this status effect"
        />

        <div className="col-span-full">
          <FormInput<Status>
            name="summary"
            label="Summary"
            placeholder="A brief description of the effect"
            description="One sentence summary shown in tooltips"
          />
        </div>
      </FormSection>

      <FormSection title="Icon" iconCategory="condition" iconName="charmed">
        <div className="col-span-full">
          <FormInput<Status>
            name="icon"
            label="Icon Path"
            placeholder="status/poisoned"
            description="Format: category/name (e.g., status/poisoned, condition/charmed)"
          />
        </div>
      </FormSection>

      <FormSection title="Duration & Stacking" iconCategory="attribute" iconName="penalty">
        <FormSelect<Status>
          name="payload.stacks"
          label="Stacking Behavior"
          placeholder="Select stacking..."
          options={stackingOptions}
          description="How multiple applications interact"
        />

        <FormInput<Status>
          name="payload.durationRounds"
          label="Duration (Rounds)"
          type="number"
          placeholder="10"
          description="Combat duration. Leave empty for permanent."
        />

        <FormInput<Status>
          name="payload.durationMinutes"
          label="Duration (Minutes)"
          type="number"
          step="0.1"
          placeholder="10"
          description="Non-combat duration"
        />
      </FormSection>

      <FormSection title="Stat Modifiers" iconCategory="attribute" iconName="bonus">
        <FormStatValueInput<Status>
          name="payload.movePenalty"
          label="Movement Modifier"
          description="50% slow = Percent Multiply with 0.5"
        />

        <FormStatValueInput<Status>
          name="payload.attackPenalty"
          label="Attack Modifier"
          description="-2 penalty = Flat Value with -2"
        />

        <FormStatValueInput<Status>
          name="payload.defenseBonus"
          label="Defense Modifier"
          description="+2 bonus = Flat Value with 2"
        />
      </FormSection>

      <FormSection title="Tags" iconCategory="ui" iconName="star">
        <div className="col-span-full">
          <FormTagInput<Status>
            name="payload.tags"
            label="Tags"
            placeholder="Type and press Enter to add tags"
            description="Categorization tags (e.g., poison, debuff, control)"
          />
        </div>
      </FormSection>

      <FormSection title="Custom Data" iconCategory="ui" iconName="settings">
        <div className="col-span-full">
          <CustomPropertiesFields
            fieldPath="payload.custom"
            suggestions={STATUS_CUSTOM_SUGGESTIONS}
            entityStatKeys={STATUS_ENTITY_KEYS}
          />
        </div>
      </FormSection>

      <FormSection title="Full Description" iconCategory="ui" iconName="book">
        <div className="col-span-full">
          <RichTextEditor
            content={watch("description") || ""}
            onChange={(html) => setValue("description", html, { shouldDirty: true })}
          />
        </div>
      </FormSection>
    </div>
  );
});

StatusForm.displayName = "StatusForm";
