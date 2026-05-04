import React from "react";
import { FormSection } from "@/components/forms/FormSection";
import { StringArrayField } from "@/components/forms/StringArrayField";
import { COMMON_LANGUAGES, COMMON_HABITATS } from "@/lib/dnd/constants";
import type { Entity } from "@/types";

export const SensesSection: React.FC = () => {
  return (
    <FormSection title="Senses" iconCategory="attribute" iconName="vision">
      <div className="col-span-full">
        <StringArrayField<Entity>
          name="senses"
          label="Senses"
          placeholder="e.g., darkvision 60 ft., passive Perception 14"
          addButtonLabel="Add Sense"
        />
      </div>
    </FormSection>
  );
};

export const LanguagesSection: React.FC = () => {
  return (
    <FormSection title="Languages" iconCategory="ui" iconName="bubble">
      <div className="col-span-full">
        <StringArrayField<Entity>
          name="languages"
          label="Languages"
          placeholder="e.g., Common, Draconic"
          description={`Common options: ${COMMON_LANGUAGES.slice(0, 5).join(", ")}, and more...`}
          addButtonLabel="Add Language"
        />
      </div>
    </FormSection>
  );
};

export const HabitatsSection: React.FC = () => {
  return (
    <FormSection title="Habitats" iconCategory="location" iconName="dungeon">
      <div className="col-span-full">
        <StringArrayField<Entity>
          name="habitats"
          label="Habitats"
          placeholder="e.g., Forest, Underdark, Swamp"
          description={`Common options: ${COMMON_HABITATS.slice(0, 5).join(", ")}, and more...`}
          addButtonLabel="Add Habitat"
        />
      </div>
    </FormSection>
  );
};
