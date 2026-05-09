import React from "react";
import { useFormContext, useWatch } from "react-hook-form";
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

const CustomStatBlockFields: React.FC = () => (
  <CustomPropertiesFields
    fieldPath="statBlock.custom"
    suggestions={CUSTOM_STAT_SUGGESTIONS}
    entityStatKeys={ENTITY_STAT_KEYS}
  />
);

const LEGACY_CUSTOM_FIELD_MAP = {
  hitDice: "hitDice",
  armorType: "armorNote",
  armorNote: "armorNote",
  burrowSpeed: "burrowSpeed",
  climbSpeed: "climbSpeed",
  swimSpeed: "swimSpeed",
  flySpeed: "flySpeed",
  hoverSpeed: "hoverSpeed",
  initiative: "initiativeBonus",
  initiativeBonus: "initiativeBonus",
} as const;

type LegacyCustomField = (typeof LEGACY_CUSTOM_FIELD_MAP)[keyof typeof LEGACY_CUSTOM_FIELD_MAP];
type LegacyCustomUpdates = Partial<Pick<Entity["statBlock"], LegacyCustomField>>;

const LEGACY_CUSTOM_FIELD_BY_KEY: Record<string, LegacyCustomField> = Object.fromEntries(
  Object.entries(LEGACY_CUSTOM_FIELD_MAP).map(([legacyKey, field]) => [
    legacyKey.toLowerCase(),
    field,
  ])
);

function isCustomStats(value: unknown): value is Record<string, string | number> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.values(value).every(
      (entry) => typeof entry === "string" || typeof entry === "number"
    )
  );
}

function parseNumericCustom(value: string | number): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function hasStructuredValue(value: unknown): value is string | number {
  return (
    (typeof value === "string" && value !== "") ||
    (typeof value === "number" && Number.isFinite(value))
  );
}

function parseLegacyCustomField(
  field: LegacyCustomField,
  value: string | number
): string | number | null {
  if (field === "hitDice" || field === "armorNote") {
    const text = String(value).trim();
    return text === "" ? null : text;
  }

  return parseNumericCustom(value);
}

function setLegacyUpdate(
  updates: LegacyCustomUpdates,
  field: LegacyCustomField,
  value: string | number
): void {
  switch (field) {
    case "hitDice":
      if (typeof value === "string") updates.hitDice = value;
      break;
    case "armorNote":
      if (typeof value === "string") updates.armorNote = value;
      break;
    case "burrowSpeed":
      if (typeof value === "number") updates.burrowSpeed = value;
      break;
    case "climbSpeed":
      if (typeof value === "number") updates.climbSpeed = value;
      break;
    case "swimSpeed":
      if (typeof value === "number") updates.swimSpeed = value;
      break;
    case "flySpeed":
      if (typeof value === "number") updates.flySpeed = value;
      break;
    case "hoverSpeed":
      if (typeof value === "number") updates.hoverSpeed = value;
      break;
    case "initiativeBonus":
      if (typeof value === "number") updates.initiativeBonus = value;
      break;
  }
}

export function migrateLegacyCustomStats(statBlock: Entity["statBlock"]): {
  custom: Record<string, string | number>;
  updates: LegacyCustomUpdates;
  changed: boolean;
} {
  const custom = statBlock.custom;
  if (!isCustomStats(custom)) {
    return { custom: {}, updates: {}, changed: false };
  }

  const nextCustom = { ...custom };
  const updates: LegacyCustomUpdates = {};
  let changed = false;

  Object.entries(custom).forEach(([key, value]) => {
    const field = LEGACY_CUSTOM_FIELD_BY_KEY[key.toLowerCase()];
    if (!field) return;

    const currentValue = statBlock[field];
    if (hasStructuredValue(currentValue)) {
      delete nextCustom[key];
      changed = true;
      return;
    }

    const parsedValue = parseLegacyCustomField(field, value);
    if (!hasStructuredValue(parsedValue)) return;

    setLegacyUpdate(updates, field, parsedValue);
    delete nextCustom[key];
    changed = true;
  });

  return { custom: nextCustom, updates, changed };
}

export const StatBlockSection: React.FC = () => {
  const { control, register, setValue } = useFormContext<Entity>();
  const statBlock = useWatch({ control, name: "statBlock" });

  React.useEffect(() => {
    if (!statBlock) return;

    const migration = migrateLegacyCustomStats(statBlock);
    if (!migration.changed) return;

    Object.entries(migration.updates).forEach(([field, value]) => {
      switch (field) {
        case "hitDice":
          setValue("statBlock.hitDice", value as string, { shouldDirty: false });
          break;
        case "armorNote":
          setValue("statBlock.armorNote", value as string, { shouldDirty: false });
          break;
        case "burrowSpeed":
          setValue("statBlock.burrowSpeed", value as number, { shouldDirty: false });
          break;
        case "climbSpeed":
          setValue("statBlock.climbSpeed", value as number, { shouldDirty: false });
          break;
        case "swimSpeed":
          setValue("statBlock.swimSpeed", value as number, { shouldDirty: false });
          break;
        case "flySpeed":
          setValue("statBlock.flySpeed", value as number, { shouldDirty: false });
          break;
        case "hoverSpeed":
          setValue("statBlock.hoverSpeed", value as number, { shouldDirty: false });
          break;
        case "initiativeBonus":
          setValue("statBlock.initiativeBonus", value as number, { shouldDirty: false });
          break;
      }
    });

    setValue("statBlock.custom", migration.custom, { shouldDirty: false });
  }, [setValue, statBlock]);

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
        <Label className="block">Movement</Label>
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
              placeholder="Optional"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="statBlock.climbSpeed">Climb</Label>
            <Input
              id="statBlock.climbSpeed"
              type="number"
              {...register("statBlock.climbSpeed", { valueAsNumber: true })}
              placeholder="Optional"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="statBlock.flySpeed">Fly</Label>
            <Input
              id="statBlock.flySpeed"
              type="number"
              {...register("statBlock.flySpeed", { valueAsNumber: true })}
              placeholder="Optional"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="statBlock.swimSpeed">Swim</Label>
            <Input
              id="statBlock.swimSpeed"
              type="number"
              {...register("statBlock.swimSpeed", { valueAsNumber: true })}
              placeholder="Optional"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="statBlock.hoverSpeed">Hover</Label>
            <Input
              id="statBlock.hoverSpeed"
              type="number"
              {...register("statBlock.hoverSpeed", { valueAsNumber: true })}
              placeholder="Optional"
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
};
