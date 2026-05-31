import React from "react";
import {
  BasicInfoSection,
  ChallengeSection,
  TaxonomySection,
  StatBlockSection,
  SensesSection,
  LanguagesSection,
  HabitatsSection,
  DescriptionSection,
  NotesSection,
} from "./entity";
import {
  SavingThrowsSection,
  SkillsSection,
  DamageResistancesSection,
  ConditionImmunitiesSection,
} from "./entity/CombatSection";
import { LootSection } from "./entity/LootSection";
import { GallerySection } from "./entity/GallerySection";
import { FormSection } from "@/components/forms/FormSection";
import { FormEntryPicker } from "@/components/forms/FormPrimitives";
import { DeferredMount } from "@/components/shared/DeferredMount";
import type { Entity } from "@/types";

// Reserves vertical space for a not-yet-mounted section so scroll position
// and form height stay roughly stable as DeferredMount sections come into
// view. A muted box (not the shimmer Skeleton) keeps a dozen placeholders
// from visually competing with each other on first paint.
function SectionPlaceholder({ height = "12rem" }: { height?: string }) {
  return (
    <div
      aria-hidden="true"
      className="w-full rounded-lg border border-border/20 bg-muted/10"
      style={{ minHeight: height }}
    />
  );
}

export const EntityForm = React.memo(() => {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Above the fold: mount immediately so the user can edit core fields
          without waiting on the heavier below-fold sections. */}
      <BasicInfoSection />
      <ChallengeSection />
      <TaxonomySection />
      <StatBlockSection />

      {/* Below the fold: deferred to keep form-open under 200ms (avoids React scheduler chunking). */}
      <DeferredMount fallback={<SectionPlaceholder />}>
        <SavingThrowsSection />
      </DeferredMount>
      <DeferredMount fallback={<SectionPlaceholder height="20rem" />}>
        <SkillsSection />
      </DeferredMount>
      <DeferredMount fallback={<SectionPlaceholder />}>
        <DamageResistancesSection />
      </DeferredMount>
      <DeferredMount fallback={<SectionPlaceholder height="10rem" />}>
        <ConditionImmunitiesSection />
      </DeferredMount>
      <DeferredMount fallback={<SectionPlaceholder height="9rem" />}>
        <SensesSection />
      </DeferredMount>
      <DeferredMount fallback={<SectionPlaceholder height="9rem" />}>
        <LanguagesSection />
      </DeferredMount>
      <DeferredMount fallback={<SectionPlaceholder height="9rem" />}>
        <HabitatsSection />
      </DeferredMount>
      <DeferredMount fallback={<SectionPlaceholder height="18rem" />}>
        <DescriptionSection />
      </DeferredMount>
      <DeferredMount fallback={<SectionPlaceholder height="18rem" />}>
        <NotesSection />
      </DeferredMount>
      <DeferredMount fallback={<SectionPlaceholder height="14rem" />}>
        <FormSection title="Abilities" iconCategory="ability" iconName="action">
          <FormEntryPicker<Entity>
            className="col-span-full"
            name="abilityIds"
            label="Abilities"
            context="abilities"
            description="Assign abilities, actions, and traits this creature can use"
          />
        </FormSection>
      </DeferredMount>
      <DeferredMount fallback={<SectionPlaceholder height="14rem" />}>
        <FormSection title="Active Status Effects" iconCategory="status" iconName="charmed">
          <FormEntryPicker<Entity>
            className="col-span-full"
            name="statusIds"
            label="Active Statuses"
            context="statuses"
            description="Status effects currently affecting this creature"
          />
        </FormSection>
      </DeferredMount>
      <DeferredMount fallback={<SectionPlaceholder height="14rem" />}>
        <LootSection />
      </DeferredMount>
      <DeferredMount fallback={<SectionPlaceholder height="16rem" />}>
        <GallerySection />
      </DeferredMount>
    </div>
  );
});

EntityForm.displayName = "EntityForm";
