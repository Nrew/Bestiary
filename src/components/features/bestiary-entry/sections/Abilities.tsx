import React, { useEffect, useMemo } from "react";
import { useAbilitiesMap, useAppStore } from "@/store/appStore";
import { escapeHtml } from "@/lib/sanitize";
import { RichTextViewer } from "@/components/shared/RichTextViewer";
import type { Entity, Ability } from "@/types";


export function buildAbilityHtml(name: string, description: string): string {
  const content = description.replace(/^<p>/, "").replace(/<\/p>\s*$/, "");
  return `<p><strong><em>${escapeHtml(name)}.</em></strong> ${content}</p>`;
}

export const AbilityText: React.FC<{ ability: Ability }> = ({ ability }) => {
  const html = useMemo(
    () => buildAbilityHtml(ability.name, ability.description),
    [ability.name, ability.description]
  );

  return <RichTextViewer html={html} className="text-[16px]" />;
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
  };

  const groupedAbilities = entityAbilities.reduce<AbilityGroup>(
    (acc, ability) => {
      switch (ability.type) {
        case "action": acc.actions.push(ability); break;
        case "bonusAction": acc.bonusActions.push(ability); break;
        case "reaction": acc.reactions.push(ability); break;
        case "legendary": acc.legendaryActions.push(ability); break;
        case "mythic": acc.mythicActions.push(ability); break;
        case "passive": acc.traits.push(ability); break;
        case "lair": break;
      }
      return acc;
    },
    {
      traits: [],
      actions: [],
      bonusActions: [],
      reactions: [],
      legendaryActions: [],
      mythicActions: [],
    }
  );

  const renderGroup = (abilities: Ability[], header?: string) => {
    if (abilities.length === 0) return null;
    return (
      <div className="space-y-2">
        {header && <h3>{header}</h3>}
        {abilities.map((ability) => (
          <AbilityText key={ability.id} ability={ability} />
        ))}
      </div>
    );
  };

  const renderSpecialGroup = (
    abilities: Ability[],
    header: string,
    badge?: string
  ) => {
    if (abilities.length === 0) return null;
    return (
      <div className="space-y-3">
        <hr className="stat-block-divider" />
        <div className="flex flex-col items-center gap-0.5">
          <h3 className="font-display text-base tracking-widest uppercase text-leather">{header}</h3>
          {badge && (
            <span className="text-[11px] font-serif uppercase tracking-widest text-ink/40">{badge}</span>
          )}
        </div>
        <div className="space-y-2">
          {abilities.map((ability) => (
            <AbilityText key={ability.id} ability={ability} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {renderGroup(groupedAbilities.traits)}
      {renderGroup(groupedAbilities.actions, "Actions")}
      {renderGroup(groupedAbilities.bonusActions, "Bonus Actions")}
      {renderGroup(groupedAbilities.reactions, "Reactions")}
      {renderSpecialGroup(
        groupedAbilities.legendaryActions,
        "Legendary Actions",
        data.legendaryActionsPerRound != null && data.legendaryActionsPerRound > 0
          ? `${data.legendaryActionsPerRound} per round`
          : undefined
      )}
      {renderSpecialGroup(
        groupedAbilities.mythicActions,
        "Mythic Actions"
      )}
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
