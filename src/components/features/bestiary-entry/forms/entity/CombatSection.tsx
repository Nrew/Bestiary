import React from "react";
import { useFormContext, useFieldArray, useWatch } from "react-hook-form";
import { FormSection } from "@/components/forms/FormSection";
import { FormEntryPicker } from "@/components/forms/FormPrimitives";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGameEnums } from "@/store/appStore";
import { Trash2, Check } from "lucide-react";
import {
  COMMON_SKILLS,
  SKILL_LABELS,
  DAMAGE_TYPE_LABELS,
  RESISTANCE_LEVEL_LABELS,
  ABILITY_SCORE_SHORT,
  ABILITY_SCORE_NAMES,
  SKILL_ABILITIES,
  type SkillKey,
} from "@/lib/dnd/constants";
import { calculateAbilityModifier } from "@/lib/dnd/calculations";
import { cn } from "@/lib/utils";
import type { Entity, DamageType, ResistanceLevel, Attribute } from "@/types";


function getAbilityScore(statBlock: Entity["statBlock"], attr: Attribute): number {
  return statBlock[attr] ?? 10;
}

function formatBonus(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

function getProficientBonus(
  statBlock: Entity["statBlock"],
  attr: Attribute,
  proficiency: number
): number {
  return calculateAbilityModifier(getAbilityScore(statBlock, attr)) + proficiency;
}

function recordsMatch(left: Record<string, number>, right: Record<string, number>): boolean {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every((key) => left[key] === right[key])
  );
}

function syncSelectedBonuses(
  current: Record<string, number>,
  getBonus: (key: string) => number | null
): Record<string, number> {
  const next: Record<string, number> = {};
  Object.keys(current).forEach((key) => {
    const bonus = getBonus(key);
    next[key] = bonus ?? current[key];
  });
  return recordsMatch(current, next) ? current : next;
}


export const SavingThrowsSection: React.FC = () => {
  const { control, setValue } = useFormContext<Entity>();
  const rawStatBlock = useWatch({ control, name: "statBlock" });
  const rawProficiency = useWatch({ control, name: "proficiencyBonus" });
  const rawSavingThrows = useWatch({ control, name: "savingThrows" });
  const statBlock = React.useDeferredValue(rawStatBlock);
  const proficiency = React.useDeferredValue(rawProficiency) ?? 2;
  const watchedSavingThrows = React.useDeferredValue(rawSavingThrows);
  const savingThrows = React.useMemo(
    () => watchedSavingThrows ?? {},
    [watchedSavingThrows],
  );

  React.useEffect(() => {
    const synced = syncSelectedBonuses(savingThrows, (key) =>
      ABILITY_SCORE_NAMES.includes(key as Attribute)
        ? getProficientBonus(statBlock, key as Attribute, proficiency)
        : null
    );
    if (synced !== savingThrows) {
      setValue("savingThrows", synced as Entity["savingThrows"], { shouldDirty: true });
    }
  }, [proficiency, savingThrows, setValue, statBlock]);

  const toggle = (attr: Attribute) => {
    const next: Record<string, number> = { ...(savingThrows ?? {}) };
    if (attr in next) {
      delete next[attr];
    } else {
      next[attr] = getProficientBonus(statBlock, attr, proficiency);
    }
    setValue("savingThrows", next as Entity["savingThrows"], { shouldDirty: true });
  };

  return (
    <FormSection title="Saving Throws" iconCategory="d20test" iconName="saving-throw">
      <div className="col-span-full grid grid-cols-2 md:grid-cols-3 gap-0.5">
        {ABILITY_SCORE_NAMES.map((attr) => {
          const isProficient = attr in (savingThrows ?? {});
          const mod = calculateAbilityModifier(getAbilityScore(statBlock, attr));
          const bonus = getProficientBonus(statBlock, attr, proficiency);
          return (
            <div
              key={attr}
              role="checkbox"
              aria-checked={isProficient}
              tabIndex={0}
              className="flex items-center justify-between gap-2 rounded-md px-2 py-2 cursor-pointer hover:bg-muted/40 transition-colors select-none"
              onClick={() => toggle(attr)}
              onKeyDown={(e) => { if (e.key === " ") { e.preventDefault(); toggle(attr); } else if (e.key === "Enter") toggle(attr); }}
            >
              <div className="flex items-center gap-2 pointer-events-none">
                <div
                  aria-hidden="true"
                  className={cn(
                    "shrink-0 rounded-sm border h-3 w-3 flex items-center justify-center transition-colors",
                    isProficient
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-transparent"
                  )}
                >
                  {isProficient && <Check className="h-2.5 w-2.5" />}
                </div>
                <span className="text-sm capitalize">{attr}</span>
              </div>
              <span className={cn("text-xs tabular-nums font-mono", isProficient ? "text-primary font-semibold" : "text-muted-foreground")}>
                {formatBonus(isProficient ? bonus : mod)}
              </span>
            </div>
          );
        })}
      </div>
    </FormSection>
  );
};

export const SkillsSection: React.FC = () => {
  const { control, setValue } = useFormContext<Entity>();
  const rawStatBlock = useWatch({ control, name: "statBlock" });
  const rawProficiency = useWatch({ control, name: "proficiencyBonus" });
  const rawSkills = useWatch({ control, name: "skills" });
  const statBlock = React.useDeferredValue(rawStatBlock);
  const proficiency = React.useDeferredValue(rawProficiency) ?? 2;
  const watchedSkills = React.useDeferredValue(rawSkills);
  const skills = React.useMemo(() => watchedSkills ?? {}, [watchedSkills]);

  React.useEffect(() => {
    const synced = syncSelectedBonuses(skills, (key) => {
      const ability = SKILL_ABILITIES[key as SkillKey];
      return ability ? getProficientBonus(statBlock, ability, proficiency) : null;
    });
    if (synced !== skills) {
      setValue("skills", synced, { shouldDirty: true });
    }
  }, [proficiency, setValue, skills, statBlock]);

  const toggle = (skill: string) => {
    const next: Record<string, number> = { ...(skills ?? {}) };
    if (skill in next) {
      delete next[skill];
    } else {
      const ability = SKILL_ABILITIES[skill as SkillKey];
      next[skill] = ability
        ? getProficientBonus(statBlock, ability, proficiency)
        : proficiency;
    }
    setValue("skills", next, { shouldDirty: true });
  };

  return (
    <FormSection title="Skills" iconCategory="skill" iconName="athletics">
      <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-0.5">
        {COMMON_SKILLS.map((skill) => {
          const isProficient = skill in (skills ?? {});
          const ability = SKILL_ABILITIES[skill];
          const mod = ability ? calculateAbilityModifier(getAbilityScore(statBlock, ability)) : 0;
          const bonus = ability ? getProficientBonus(statBlock, ability, proficiency) : proficiency;
          const abilityShort = ability ? ABILITY_SCORE_SHORT[ability] : "";
          return (
            <div
              key={skill}
              role="checkbox"
              aria-checked={isProficient}
              tabIndex={0}
              className="flex items-center justify-between gap-2 rounded-md px-2 py-2 cursor-pointer hover:bg-muted/40 transition-colors select-none"
              onClick={() => toggle(skill)}
              onKeyDown={(e) => { if (e.key === " ") { e.preventDefault(); toggle(skill); } else if (e.key === "Enter") toggle(skill); }}
            >
              <div className="flex items-center gap-2 min-w-0 pointer-events-none">
                <div
                  aria-hidden="true"
                  className={cn(
                    "shrink-0 rounded-sm border h-3 w-3 flex items-center justify-center transition-colors",
                    isProficient
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-transparent"
                  )}
                >
                  {isProficient && <Check className="h-2.5 w-2.5" />}
                </div>
                <span className="text-sm truncate">{SKILL_LABELS[skill]}</span>
                <span className="text-xs text-muted-foreground shrink-0">({abilityShort})</span>
              </div>
              <span className={cn("text-xs tabular-nums font-mono shrink-0", isProficient ? "text-primary font-semibold" : "text-muted-foreground")}>
                {formatBonus(isProficient ? bonus : mod)}
              </span>
            </div>
          );
        })}
      </div>
    </FormSection>
  );
};

export const DamageResistancesSection: React.FC = () => {
  const { watch, setValue, control } = useFormContext<Entity>();
  const gameEnums = useGameEnums();
  const { fields: resistanceFields, append: appendResistance, remove: removeResistance } = useFieldArray({
    control,
    name: "damageResistances",
  });

  return (
    <FormSection title="Damage Resistances & Immunities" iconCategory="damage" iconName="resistance">
      <div className="col-span-full space-y-4">
        <div className="flex items-center justify-between">
          <Label>Resistances, Immunities, Vulnerabilities</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => appendResistance({ damageType: "bludgeoning", level: "resistant" })}
          >
            Add Entry
          </Button>
        </div>

        {resistanceFields.map((field, index) => (
          <div key={field.id} className="flex gap-2 items-end">
            <div className="flex-1 space-y-2">
              <Label
                id={`damage-resistance-${index}-type-label`}
                htmlFor={`damage-resistance-${index}-type`}
              >
                Damage Type
              </Label>
              <Select
                value={watch(`damageResistances.${index}.damageType`) || "bludgeoning"}
                onValueChange={(value: DamageType) =>
                  setValue(`damageResistances.${index}.damageType`, value, { shouldDirty: true })
                }
              >
                <SelectTrigger
                  id={`damage-resistance-${index}-type`}
                  aria-labelledby={`damage-resistance-${index}-type-label`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {gameEnums?.damageTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {DAMAGE_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 space-y-2">
              <Label
                id={`damage-resistance-${index}-level-label`}
                htmlFor={`damage-resistance-${index}-level`}
              >
                Level
              </Label>
              <Select
                value={watch(`damageResistances.${index}.level`) || "resistant"}
                onValueChange={(value: ResistanceLevel) =>
                  setValue(`damageResistances.${index}.level`, value, { shouldDirty: true })
                }
              >
                <SelectTrigger
                  id={`damage-resistance-${index}-level`}
                  aria-labelledby={`damage-resistance-${index}-level-label`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {gameEnums?.resistanceLevels.map((level) => (
                    <SelectItem key={level} value={level}>
                      {RESISTANCE_LEVEL_LABELS[level]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeResistance(index)}
              className="shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
    </FormSection>
  );
};

export const ConditionImmunitiesSection: React.FC = () => {
  return (
    <FormSection title="Condition Immunities" iconCategory="damage" iconName="immunity">
      <div className="col-span-full">
        <FormEntryPicker<Entity>
          name="statusImmunities"
          label="Immune to Status Effects"
          context="statuses"
          description="Select status effects this creature is immune to"
        />
      </div>
    </FormSection>
  );
};
