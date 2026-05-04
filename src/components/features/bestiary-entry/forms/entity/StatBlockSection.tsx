import React from "react";
import { useFormContext } from "react-hook-form";
import { FormSection } from "@/components/forms/FormSection";
import { CustomPropertiesFields } from "@/components/forms/FormCollections";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ABILITY_SCORE_NAMES, ABILITY_SCORE_SHORT } from "@/lib/dnd/constants";
import type { Entity } from "@/types";

const ENTITY_STAT_KEYS = new Set([
  "transformationTarget",
  "metamorphosisTarget",
  "parentEntity",
  "summonSource",
]);

const CUSTOM_STAT_SUGGESTIONS: Record<string, string> = {
  burrowSpeed: "Burrow Speed",
  climbSpeed: "Climb Speed",
  swimSpeed: "Swim Speed",
  flySpeed: "Fly Speed",
  hoverSpeed: "Hover Speed",
  hitDice: "Hit Dice",
  armorType: "Armor Type",
  spellcastingAbility: "Spellcasting Ability",
  spellSaveDC: "Spell Save DC",
  spellAttackBonus: "Spell Attack Bonus",
  transformationTarget: "Transformation Target",
  metamorphosisTarget: "Metamorphosis Target",
  parentEntity: "Parent Entity",
  summonSource: "Summon Source",
};

const CustomStatBlockFields: React.FC = () => (
  <CustomPropertiesFields
    fieldPath="statBlock.custom"
    suggestions={CUSTOM_STAT_SUGGESTIONS}
    entityStatKeys={ENTITY_STAT_KEYS}
  />
);

export const StatBlockSection: React.FC = () => {
  const { register } = useFormContext<Entity>();

  return (
    <FormSection title="Stat Block" iconCategory="ability" iconName="strength">
      <div className="col-span-full grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="statBlock.hp">Hit Points</Label>
          <Input
            id="statBlock.hp"
            type="number"
            {...register("statBlock.hp", { valueAsNumber: true })}
            placeholder="e.g., 84"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="statBlock.armor">Armor Class</Label>
          <Input
            id="statBlock.armor"
            type="number"
            {...register("statBlock.armor", { valueAsNumber: true })}
            placeholder="e.g., 15"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="statBlock.speed">Speed (ft)</Label>
          <Input
            id="statBlock.speed"
            type="number"
            {...register("statBlock.speed", { valueAsNumber: true })}
            placeholder="e.g., 30"
          />
        </div>
      </div>

      <div className="col-span-full">
        <Label className="mb-4 block">Ability Scores</Label>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {ABILITY_SCORE_NAMES.map((attr) => (
            <div key={attr} className="space-y-2 text-center">
              <Label htmlFor={`statBlock.${attr}`} className="text-xs uppercase">
                {ABILITY_SCORE_SHORT[attr]}
              </Label>
              <Input
                id={`statBlock.${attr}`}
                type="number"
                {...register(`statBlock.${attr}`, { valueAsNumber: true })}
                className="text-center"
                placeholder="10"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="col-span-full pt-4 border-t border-border/50">
        <CustomStatBlockFields />
      </div>
    </FormSection>
  );
};
