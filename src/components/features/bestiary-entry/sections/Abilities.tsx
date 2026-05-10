import React, { useEffect, useMemo } from "react";
import { useAbilitiesMap, useAppStore } from "@/store/appStore";
import { escapeHtml } from "@/lib/sanitize";
import { RichTextViewer } from "@/components/shared/RichTextViewer";
import { AlertTriangle } from "lucide-react";
import type { Entity, Ability } from "@/types";

const AbilityGroup: React.FC<{ abilities: Ability[]; header?: string }> = ({ abilities, header }) => {
  if (abilities.length === 0) return null;
  return (
    <div className="space-y-2">
      {header && <h3 className="font-display text-base tracking-widest uppercase text-leather mt-2">{header}</h3>}
      {abilities.map((ability) => (
        <AbilityText key={ability.id} ability={ability} />
      ))}
    </div>
  );
};

const SpecialAbilityGroup: React.FC<{ abilities: Ability[]; header: string; badge?: string }> = ({ abilities, header, badge }) => {
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

  type GroupedAbilities = {
    traits: Ability[];
    actions: Ability[];
    bonusActions: Ability[];
    reactions: Ability[];
    legendaryActions: Ability[];
    mythicActions: Ability[];
  };

  const groupedAbilities = useMemo(
    () =>
      entityAbilities.reduce<GroupedAbilities>(
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
      ),
    [entityAbilities]
  );

  if (abilityIds.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <AbilityGroup abilities={groupedAbilities.traits} />
      <AbilityGroup abilities={groupedAbilities.actions} header="Actions" />
      <AbilityGroup abilities={groupedAbilities.bonusActions} header="Bonus Actions" />
      <AbilityGroup abilities={groupedAbilities.reactions} header="Reactions" />
      <SpecialAbilityGroup
        abilities={groupedAbilities.legendaryActions}
        header="Legendary Actions"
        badge={
          data.legendaryActionsPerRound != null && data.legendaryActionsPerRound > 0
            ? `${data.legendaryActionsPerRound} per round`
            : undefined
        }
      />
      <SpecialAbilityGroup
        abilities={groupedAbilities.mythicActions}
        header="Mythic Actions"
      />
      {missingAbilityIds.length > 0 && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive/60" />
          {missingAbilityIds.length === 1
            ? "One linked ability could not be loaded."
            : `${missingAbilityIds.length} linked abilities could not be loaded.`}
        </div>
      )}
    </div>
  );
};
