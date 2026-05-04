import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getThreatClassName } from "@/lib/theme";
import { ENTITY_SIZE_LABELS, THREAT_LEVEL_LABELS } from "@/lib/dnd/constants";
import { motion } from "framer-motion";
import { contentVariants } from "@/lib/animations";
import { isEntity } from "@/lib/type-guards";
import type { BestiaryEntry, Entity, ViewContext } from "@/types";

interface EntryHeaderProps {
  entry: BestiaryEntry;
  entryType: ViewContext;
}

export const EntryHeader: React.FC<EntryHeaderProps> = React.memo(({ entry, entryType }) => {

  const getSubtitle = () => {
    if (entryType === "entities" && isEntity(entry)) {
      const e: Entity = entry;
      const parts: string[] = [];
      if (e.size) parts.push(ENTITY_SIZE_LABELS[e.size] ?? e.size);
      const taxon = e.taxonomy?.species || e.taxonomy?.genus;
      parts.push(taxon || "Creature");
      return parts.join(" ");
    }
    const LABELS: Record<ViewContext, string> = {
      entities: "Entity", items: "Item", statuses: "Status", abilities: "Ability",
    };
    return LABELS[entryType] ?? entryType;
  };

  const threatLevel = isEntity(entry) ? entry.threatLevel : null;

  return (
    <motion.header variants={contentVariants} className="mb-10">
      <p className="font-serif italic capitalize text-primary">
        {getSubtitle()}
      </p>
      <h1 className="text-5xl md:text-7xl font-bold font-display text-foreground">
        {entry.name}
      </h1>
      {threatLevel && (
        <Badge
          variant="outline"
          className={cn(
            "mt-2 text-xs",
            getThreatClassName(threatLevel)
          )}
        >
          Threat:{" "}
          {
            THREAT_LEVEL_LABELS[threatLevel] || "Unknown"
          }
        </Badge>
      )}
    </motion.header>
  );
});

EntryHeader.displayName = "EntryHeader";
