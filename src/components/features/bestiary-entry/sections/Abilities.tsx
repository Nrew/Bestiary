import React, { useEffect, useMemo } from "react";
import { useAbilitiesMap, useAppStore } from "@/store/appStore";
import { sanitizeInlineHtml } from "@/lib/sanitize";
import type { Entity, Ability } from "@/types";

const AbilityText: React.FC<{ ability: Ability }> = ({ ability }) => {
  const sanitizedHtml = useMemo(
    () => sanitizeInlineHtml(ability.description),
    [ability.description]
  );

  return (
    <div className="viewer-prose text-[16px]">
      <p>
        <strong className="font-bold italic text-ink">{ability.name}.</strong>
        <span
          className="text-ink/90"
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
      </p>
    </div>
  );
};

export const AbilitiesSection: React.FC<{ data: Entity }> = ({ data }) => {
  const abilities = useAbilitiesMap();
  const ensureAbilitiesLoaded = useAppStore((s) => s.ensureAbilitiesLoaded);
  const abilityIds = useMemo(() => data.abilityIds ?? [], [data.abilityIds]);

  useEffect(() => {
    if (abilityIds.length > 0) {
      void ensureAbilitiesLoaded(abilityIds);
    }
  }, [abilityIds, ensureAbilitiesLoaded]);

  const entityAbilities = React.useMemo((): Ability[] => {
    return abilityIds
      .map((id) => abilities.get(id))
      .filter((a): a is Ability => a !== undefined);
  }, [abilityIds, abilities]);

  const missingAbilityIds = React.useMemo(
    () => abilityIds.filter((id) => !abilities.has(id)),
    [abilityIds, abilities]
  );

  if (abilityIds.length === 0) {
    return null;
  }

  type AbilityGroup = {
    traits: Ability[];
    actions: Ability[];
    bonusActions: Ability[];
    reactions: Ability[];
    legendaryActions: Ability[];
    mythicActions: Ability[];
    lairActions: Ability[];
  };

  const groupedAbilities = entityAbilities.reduce<AbilityGroup>(
    (acc, ability) => {
      switch (ability.type) {
        case "action": acc.actions.push(ability); break;
        case "bonusAction": acc.bonusActions.push(ability); break;
        case "reaction": acc.reactions.push(ability); break;
        case "legendary": acc.legendaryActions.push(ability); break;
        case "mythic": acc.mythicActions.push(ability); break;
        case "lair": acc.lairActions.push(ability); break;
        case "passive": acc.traits.push(ability); break;
      }
      return acc;
    },
    { traits: [], actions: [], bonusActions: [], reactions: [], legendaryActions: [], mythicActions: [], lairActions: [] }
  );

  const renderGroup = (abilities: Ability[], header?: string) => {
    if (abilities.length === 0) return null;
    return (
      <div className="space-y-2">
        {header && <h3 className="stat-block-actions-header">{header}</h3>}
        {abilities.map((ability) => (
          <AbilityText key={ability.id} ability={ability} />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {renderGroup(groupedAbilities.traits)}
      {renderGroup(groupedAbilities.actions, "Actions")}
      {renderGroup(groupedAbilities.bonusActions, "Bonus Actions")}
      {renderGroup(groupedAbilities.reactions, "Reactions")}
      {renderGroup(groupedAbilities.legendaryActions, "Legendary Actions")}
      {renderGroup(groupedAbilities.mythicActions, "Mythic Actions")}
      {renderGroup(groupedAbilities.lairActions, "Lair Actions")}
      {missingAbilityIds.length > 0 && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {missingAbilityIds.length === 1
            ? "One linked ability could not be loaded."
            : `${missingAbilityIds.length} linked abilities could not be loaded.`}
        </div>
      )}
    </div>
  );
};
