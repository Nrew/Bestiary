import React from "react";
import {
  BasicInfoSection,
  ChallengeSection,
  TaxonomySection,
  StatBlockSection,
  SavingThrowsSection,
  SkillsSection,
  DamageResistancesSection,
  ConditionImmunitiesSection,
  SensesSection,
  LanguagesSection,
  HabitatsSection,
  DescriptionSection,
  NotesSection,
  LootSection,
  GallerySection,
} from "./entity";
import { FormSection } from "@/components/forms/FormSection";
import { FormEntryPicker } from "@/components/forms/FormPrimitives";
import type { Entity } from "@/types";

export const EntityForm: React.FC = React.memo(() => {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <BasicInfoSection />
      <ChallengeSection />
      <TaxonomySection />
      <StatBlockSection />
      <SavingThrowsSection />
      <SkillsSection />
      <DamageResistancesSection />
      <ConditionImmunitiesSection />
      <FormSection title="Abilities" iconCategory="ability" iconName="action">
        <div className="col-span-full">
          <FormEntryPicker<Entity>
            name="abilityIds"
            label="Abilities"
            context="abilities"
            description="Assign abilities, actions, and traits this creature can use"
          />
        </div>
      </FormSection>
      <SensesSection />
      <LanguagesSection />
      <HabitatsSection />
      <DescriptionSection />
      <NotesSection />
      <FormSection title="Active Status Effects" iconCategory="status" iconName="charmed">
        <div className="col-span-full">
          <FormEntryPicker<Entity>
            name="statusIds"
            label="Active Statuses"
            context="statuses"
            description="Status effects currently affecting this creature"
          />
        </div>
      </FormSection>
      <LootSection />
      <GallerySection />
    </div>
  );
});

EntityForm.displayName = "EntityForm";
