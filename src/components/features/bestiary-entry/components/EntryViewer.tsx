import React from "react";
import { Button } from "@/components/ui/button";
import {
  OverviewSection,
  StatBlockSection,
  AbilitiesSection,
  ConditionsSection,
  LootSection,
  NotesSection,
  PortraitSection,
  GallerySection,
  ItemDetailsSection,
  ItemDescriptionSection,
  StatusDetailsSection,
  StatusSummarySection,
  StatusDescriptionSection,
  AbilityDetailsSection,
  AbilityEffectsSection,
  AbilityDescriptionSection,
} from "../sections";
import { EntryHeader } from "./EntryHeader";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { Edit } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { slideUpVariants, staggerContainerVariants, contentVariants } from "@/lib/animations";
import { ENTITY_SIZE_LABELS, THREAT_LEVEL_LABELS } from "@/lib/dnd/constants";
import { hasItems, hasMeaningfulString } from "@/lib/empty";
import { isAbility, isEntity, isItem, isStatus } from "@/lib/type-guards";
import type { BestiaryEntry, Entity, Item, Status, Ability, ViewContext } from "@/types";

const Section: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <motion.div variants={contentVariants}>
    <ErrorBoundary level="component">{children}</ErrorBoundary>
  </motion.div>
);

const KeyInfoSection: React.FC<{ data: Entity }> = ({ data }) => {
  const hasAnyKeyInfo =
    hasMeaningfulString(data.size) ||
    hasMeaningfulString(data.threatLevel) ||
    hasMeaningfulString(data.taxonomy?.genus) ||
    hasMeaningfulString(data.taxonomy?.species) ||
    hasMeaningfulString(data.taxonomy?.subspecies) ||
    hasItems(data.habitats);

  if (!hasAnyKeyInfo) return null;

  return (
  <div className="stone-plate">
    <h3 className="font-display text-lg mb-2 text-primary text-center">
      Key Information
    </h3>
    <div className="space-y-2 text-sm font-serif">
      {data.size && (
        <div className="flex justify-between">
          <strong className="text-foreground/70">Size</strong>
          <span>{ENTITY_SIZE_LABELS[data.size]}</span>
        </div>
      )}
      {data.threatLevel && (
        <div className="flex justify-between">
          <strong className="text-foreground/70">Threat Level</strong>
          <span>{THREAT_LEVEL_LABELS[data.threatLevel]}</span>
        </div>
      )}
      {data.taxonomy?.genus && (
        <div className="flex justify-between">
          <strong className="text-foreground/70">Genus</strong>
          <span className="italic">{data.taxonomy.genus}</span>
        </div>
      )}
      {data.taxonomy?.species && (
        <div className="flex justify-between">
          <strong className="text-foreground/70">Species</strong>
          <span className="italic">{data.taxonomy.species}</span>
        </div>
      )}
      {data.taxonomy?.subspecies && (
        <div className="flex justify-between">
          <strong className="text-foreground/70">Subspecies</strong>
          <span className="italic">{data.taxonomy.subspecies}</span>
        </div>
      )}
      {data.habitats && data.habitats.length > 0 && (
        <div className="flex justify-between">
          <strong className="text-foreground/70">Habitats</strong>
          <span className="text-right">{data.habitats.join(", ")}</span>
        </div>
      )}
    </div>
  </div>
  );
};

const EntityViewer: React.FC<{ data: Entity }> = ({ data }) => (
  <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-12">
    <div className="lg:col-span-2 space-y-12">
      <Section><OverviewSection data={data} /></Section>
      <Section><AbilitiesSection data={data} /></Section>
      <Section><ConditionsSection data={data} /></Section>
      <Section><GallerySection data={data} /></Section>
      <Section><NotesSection data={data} /></Section>
    </div>
    <div className="lg:col-span-1 space-y-8 mt-12 lg:mt-0">
      <Section><PortraitSection data={data} /></Section>
      <Section><StatBlockSection data={data} /></Section>
      <Section><KeyInfoSection data={data} /></Section>
      <Section><LootSection data={data} /></Section>
    </div>
  </div>
);

const ItemViewer: React.FC<{ data: Item }> = ({ data }) => (
  <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-12">
    <div className="lg:col-span-2 space-y-12">
      <Section><ItemDescriptionSection data={data} /></Section>
    </div>
    <div className="lg:col-span-1 space-y-8 mt-12 lg:mt-0">
      <Section><ItemDetailsSection data={data} /></Section>
    </div>
  </div>
);

const StatusViewer: React.FC<{ data: Status }> = ({ data }) => (
  <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-12">
    <div className="lg:col-span-2 space-y-12">
      <Section><StatusSummarySection data={data} /></Section>
      <Section><StatusDescriptionSection data={data} /></Section>
    </div>
    <div className="lg:col-span-1 space-y-8 mt-12 lg:mt-0">
      <Section><StatusDetailsSection data={data} /></Section>
    </div>
  </div>
);

const AbilityViewer: React.FC<{ data: Ability }> = ({ data }) => (
  <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-12">
    <div className="lg:col-span-2 space-y-12">
      <Section><AbilityDescriptionSection data={data} /></Section>
      <Section><AbilityEffectsSection data={data} /></Section>
    </div>
    <div className="lg:col-span-1 space-y-8 mt-12 lg:mt-0">
      <Section><AbilityDetailsSection data={data} /></Section>
    </div>
  </div>
);

export const EntryViewer: React.FC<{
  entry: BestiaryEntry;
  entryType: ViewContext;
  onEdit: () => void;
}> = React.memo(({ entry, entryType, onEdit }) => {
  const renderByEntryShape = () => {
    if (isEntity(entry)) return <EntityViewer data={entry} />;
    if (isItem(entry)) return <ItemViewer data={entry} />;
    if (isStatus(entry)) return <StatusViewer data={entry} />;
    if (isAbility(entry)) return <AbilityViewer data={entry} />;
    return null;
  };

  const renderContent = () => {
    switch (entryType) {
      case "entities":
        return isEntity(entry) ? <EntityViewer data={entry} /> : renderByEntryShape();
      case "items":
        return isItem(entry) ? <ItemViewer data={entry} /> : renderByEntryShape();
      case "statuses":
        return isStatus(entry) ? <StatusViewer data={entry} /> : renderByEntryShape();
      case "abilities":
        return isAbility(entry) ? <AbilityViewer data={entry} /> : renderByEntryShape();
      default:
        return renderByEntryShape();
    }
  };

  return (
    <div className="h-full relative">
      <AnimatePresence mode="popLayout">
        <motion.div
          key={entry.id}
          variants={slideUpVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="max-w-7xl mx-auto p-6 md:p-10 lg:p-12"
        >
          <motion.div
            variants={staggerContainerVariants}
            initial="hidden"
            animate="visible"
          >
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              className="absolute top-6 right-6 md:top-8 md:right-8 z-10 border-leather/50 bg-parchment/90 text-leather hover:bg-leather/10 hover:border-leather backdrop-blur-sm"
            >
              <Edit className="w-4 h-4 mr-2" /> Edit Page
            </Button>

            <EntryHeader entry={entry} entryType={entryType} />

            {renderContent()}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
});

EntryViewer.displayName = "EntryViewer";
