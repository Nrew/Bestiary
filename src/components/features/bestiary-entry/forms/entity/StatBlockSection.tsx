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
  spellcastingAbility: "Spellcasting Ability",
  spellSaveDC: "Spell Save DC",
  spellAttackBonus: "Spell Attack Bonus",
  transformationTarget: "Transformation Target",
  metamorphosisTarget: "Metamorphosis Target",
  parentEntity: "Parent Entity",
  summonSource: "Summon Source",
};

function CustomStatBlockFields() {
  return (
    <CustomPropertiesFields
      fieldPath="statBlock.custom"
      suggestions={CUSTOM_STAT_SUGGESTIONS}
      entityStatKeys={ENTITY_STAT_KEYS}
    />
  );
}

export function StatBlockSection() {
  const { register } = useFormContext<Entity>();

  return (
    <FormSection title="Stat Block" iconCategory="ability" iconName="strength">
      <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <Label htmlFor="statBlock.hitDice">Hit Dice</Label>
          <Input
            id="statBlock.hitDice"
            {...register("statBlock.hitDice")}
            placeholder="e.g., 8d10 + 40"
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
          <Label htmlFor="statBlock.armorNote">Armor Note</Label>
          <Input
            id="statBlock.armorNote"
            {...register("statBlock.armorNote")}
            placeholder="e.g., natural armor"
          />
        </div>
      </div>

      <div className="col-span-full space-y-4 pt-4 border-t border-border/50">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Movement</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="statBlock.speed">Walking</Label>
            <Input
              id="statBlock.speed"
              type="number"
              {...register("statBlock.speed", { valueAsNumber: true })}
              placeholder="30"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="statBlock.burrowSpeed">Burrow</Label>
            <Input
              id="statBlock.burrowSpeed"
              type="number"
              {...register("statBlock.burrowSpeed", { valueAsNumber: true })}
              placeholder="e.g., 20"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="statBlock.climbSpeed">Climb</Label>
            <Input
              id="statBlock.climbSpeed"
              type="number"
              {...register("statBlock.climbSpeed", { valueAsNumber: true })}
              placeholder="e.g., 30"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="statBlock.flySpeed">Fly</Label>
            <Input
              id="statBlock.flySpeed"
              type="number"
              {...register("statBlock.flySpeed", { valueAsNumber: true })}
              placeholder="e.g., 60"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="statBlock.swimSpeed">Swim</Label>
            <Input
              id="statBlock.swimSpeed"
              type="number"
              {...register("statBlock.swimSpeed", { valueAsNumber: true })}
              placeholder="e.g., 30"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="statBlock.hoverSpeed">Hover</Label>
            <Input
              id="statBlock.hoverSpeed"
              type="number"
              {...register("statBlock.hoverSpeed", { valueAsNumber: true })}
              placeholder="e.g., 30"
            />
          </div>
        </div>
      </div>

      <div className="col-span-full grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border/50">
        <div className="space-y-2">
          <Label htmlFor="statBlock.initiativeBonus">Initiative Override</Label>
          <Input
            id="statBlock.initiativeBonus"
            type="number"
            {...register("statBlock.initiativeBonus", { valueAsNumber: true })}
            placeholder="Uses Dex modifier"
          />
          <p className="text-xs text-muted-foreground">
            Leave blank unless initiative differs from Dexterity.
          </p>
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
}
