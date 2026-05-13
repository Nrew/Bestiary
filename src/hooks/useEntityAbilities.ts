import { useMemo } from "react";
import { useAbilitiesMap, useAppStore } from "@/store/appStore";
import { useLoadedReferences } from "@/hooks/useLoadedReferences";
import { isAbility } from "@/lib/type-guards";
import type { Ability, Entity } from "@/types";

export interface EntityAbilities {
  traits: Ability[];
  actions: Ability[];
  bonusActions: Ability[];
  reactions: Ability[];
  legendaryActions: Ability[];
  mythicActions: Ability[];
  lairActions: Ability[];
  missingIds: string[];
  loading: boolean;
  error: Error | null;
}

const emptyEntityAbilities: EntityAbilities = {
  traits: [],
  actions: [],
  bonusActions: [],
  reactions: [],
  legendaryActions: [],
  mythicActions: [],
  lairActions: [],
  missingIds: [],
  loading: false,
  error: null,
};

/**
 * Single source of truth for resolving + grouping an entity's referenced
 * abilities. Sibling sections (AbilitiesSection, LairActionsPanel) call this
 * once at the viewer level so they share one IPC load + one loading state.
 */
export function useEntityAbilities(data: Entity): EntityAbilities {
  const abilities = useAbilitiesMap();
  const ensureAbilitiesLoaded = useAppStore((s) => s.ensureAbilitiesLoaded);
  const abilityIds = useMemo(() => data.abilityIds ?? [], [data.abilityIds]);
  const { entries, missingIds, loading, error } = useLoadedReferences(
    abilityIds,
    abilities,
    ensureAbilitiesLoaded,
  );

  return useMemo(() => {
    if (abilityIds.length === 0) return emptyEntityAbilities;

    const grouped: Omit<EntityAbilities, "missingIds" | "loading" | "error"> = {
      traits: [],
      actions: [],
      bonusActions: [],
      reactions: [],
      legendaryActions: [],
      mythicActions: [],
      lairActions: [],
    };

    for (const candidate of entries) {
      if (!isAbility(candidate)) continue;
      switch (candidate.type) {
        case "action": grouped.actions.push(candidate); break;
        case "bonusAction": grouped.bonusActions.push(candidate); break;
        case "reaction": grouped.reactions.push(candidate); break;
        case "legendary": grouped.legendaryActions.push(candidate); break;
        case "mythic": grouped.mythicActions.push(candidate); break;
        case "passive": grouped.traits.push(candidate); break;
        case "lair": grouped.lairActions.push(candidate); break;
      }
    }

    return { ...grouped, missingIds, loading, error };
  }, [abilityIds.length, entries, missingIds, loading, error]);
}
