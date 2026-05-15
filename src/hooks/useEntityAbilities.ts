import { useMemo } from "react";
import { useAbilitiesMap, useAppStore } from "@/store/appStore";
import { useLoadedReferences } from "@/hooks/useLoadedReferences";
import { isAbility } from "@/lib/type-guards";
import { assertNever } from "@/lib/dnd/format-utils";
import type { Ability, Entity } from "@/types";

export interface EntityAbilities {
  traits: Ability[];
  actions: Ability[];
  bonusActions: Ability[];
  reactions: Ability[];
  legendaryActions: Ability[];
  mythicActions: Ability[];
  lairActions: Ability[];
  multiattacks: Ability[];
  regionalEffects: Ability[];
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
  multiattacks: [],
  regionalEffects: [],
  missingIds: [],
  loading: false,
  error: null,
};

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
      multiattacks: [],
      regionalEffects: [],
    };

    for (const candidate of entries) {
      if (!isAbility(candidate)) continue;
      // category > timing: multiattack-as-bonus-action groups under multiattacks
      if (candidate.category === "multiattack") {
        grouped.multiattacks.push(candidate);
        continue;
      }
      if (candidate.category === "regionalEffect") {
        grouped.regionalEffects.push(candidate);
        continue;
      }
      switch (candidate.timing) {
        case "action": grouped.actions.push(candidate); break;
        case "bonusAction": grouped.bonusActions.push(candidate); break;
        case "reaction": grouped.reactions.push(candidate); break;
        case "legendary": grouped.legendaryActions.push(candidate); break;
        case "mythic": grouped.mythicActions.push(candidate); break;
        case "passive": grouped.traits.push(candidate); break;
        case "lair": grouped.lairActions.push(candidate); break;
        default:
          assertNever(candidate.timing);
      }
    }

    return { ...grouped, missingIds, loading, error };
  }, [abilityIds, entries, missingIds, loading, error]);
}
