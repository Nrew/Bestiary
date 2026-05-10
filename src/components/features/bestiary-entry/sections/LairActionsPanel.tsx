import React, { useMemo } from "react";
import { isAbility } from "@/lib/type-guards";
import { useAbilitiesMap } from "@/store/appStore";
import { AbilityText } from "./Abilities";
import type { Ability, Entity } from "@/types";

export const LairActionsPanel: React.FC<{ data: Entity }> = ({ data }) => {
  const abilities = useAbilitiesMap();
  const abilityIds = useMemo(() => data.abilityIds ?? [], [data.abilityIds]);

  const lairActions = useMemo(
    () =>
      abilityIds
        .map((id) => abilities.get(id))
        .filter(
          (ability): ability is Ability =>
            isAbility(ability) && ability.type === "lair"
        ),
    [abilityIds, abilities]
  );

  if (lairActions.length === 0) {
    return null;
  }

  return (
    <div className="stone-plate space-y-4">
      <h3 className="font-display text-lg text-primary text-center">
        Lair Actions
      </h3>
      <div className="space-y-2">
        {lairActions.map((ability) => (
          <AbilityText key={ability.id} ability={ability} />
        ))}
      </div>
    </div>
  );
};
