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
import { formatBonus } from "@/lib/dnd/format-utils";
import { cn } from "@/lib/utils";
import type { Entity, DamageType, ResistanceLevel, Attribute } from "@/types";


// Stored bonus values are stale until save (normalizeEntityCombatBonuses
// recomputes them in handleSave). Display uses live values from the stat block.

interface ProficiencyRowProps {
  label: React.ReactNode;
  mod: number;
  bonus: number;
  isProficient: boolean;
  onToggle: () => void;
}

function ProficiencyRow({
  label,
  mod,
  bonus,
  isProficient,
  onToggle,
}: ProficiencyRowProps) {
  return (
    <div
      role="checkbox"
      aria-checked={isProficient}
      tabIndex={0}
      className="flex items-center justify-between gap-2 rounded-md px-2 py-2 cursor-pointer hover:bg-muted/40 transition-colors select-none"
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === " ") {
          e.preventDefault();
          onToggle();
        } else if (e.key === "Enter") {
          onToggle();
        }
      }}
    >
      <div className="flex items-center gap-2 min-w-0 pointer-events-none">
        <div
          aria-hidden="true"
          className={cn(
            "shrink-0 rounded-sm border h-3 w-3 flex items-center justify-center transition-colors",
            isProficient
              ? "border-primary bg-primary/10 text-primary"
              : "border-transparent",
          )}
        >
          {isProficient && <Check className="h-2.5 w-2.5" />}
        </div>
        {label}
      </div>
      <span
        className={cn(
          "text-xs tabular-nums font-mono shrink-0",
          isProficient ? "text-primary font-semibold" : "text-muted-foreground",
        )}
      >
        {formatBonus(isProficient ? bonus : mod)}
      </span>
    </div>
  );
}

function SavingThrowRow({ attr }: { attr: Attribute }) {
  const { control, setValue, getValues } = useFormContext<Entity>();
  const rawScore = useWatch({ control, name: `statBlock.${attr}` as const });
  const rawProficiency = useWatch({ control, name: "proficiencyBonus" });
  const rawBonus = useWatch({ control, name: `savingThrows.${attr}` as const });
  const proficiency = rawProficiency ?? 2;
  const isProficient = rawBonus !== undefined && rawBonus !== null;
  const mod = calculateAbilityModifier(rawScore ?? 10);
  const bonus = mod + proficiency;

  const handleToggle = () => {
    const current = getValues("savingThrows") ?? {};
    const next: Record<string, number> = { ...current };
    if (attr in next) delete next[attr];
    else next[attr] = bonus;
    setValue("savingThrows", next as Entity["savingThrows"], { shouldDirty: true });
  };

  return (
    <ProficiencyRow
      label={<span className="text-sm capitalize">{attr}</span>}
      mod={mod}
      bonus={bonus}
      isProficient={isProficient}
      onToggle={handleToggle}
    />
  );
}

export function SavingThrowsSection() {
  return (
    <FormSection title="Saving Throws" iconCategory="d20test" iconName="saving-throw">
      <div className="col-span-full grid grid-cols-2 md:grid-cols-3 gap-0.5">
        {ABILITY_SCORE_NAMES.map((attr) => (
          <SavingThrowRow key={attr} attr={attr} />
        ))}
      </div>
    </FormSection>
  );
}

function SkillRow({ skill }: { skill: SkillKey }) {
  const { control, setValue, getValues } = useFormContext<Entity>();
  const ability = SKILL_ABILITIES[skill];
  const rawScore = useWatch({ control, name: `statBlock.${ability}` as const });
  const rawProficiency = useWatch({ control, name: "proficiencyBonus" });
  const rawBonus = useWatch({ control, name: `skills.${skill}` as const });
  const proficiency = rawProficiency ?? 2;
  const isProficient = rawBonus !== undefined && rawBonus !== null;
  const abilityShort = ABILITY_SCORE_SHORT[ability];
  const mod = calculateAbilityModifier(rawScore ?? 10);
  const bonus = mod + proficiency;

  const handleToggle = () => {
    const current = getValues("skills") ?? {};
    const next: Record<string, number> = { ...current };
    if (skill in next) delete next[skill];
    else next[skill] = bonus;
    setValue("skills", next, { shouldDirty: true });
  };

  return (
    <ProficiencyRow
      label={
        <>
          <span className="text-sm truncate">{SKILL_LABELS[skill]}</span>
          <span className="text-xs text-muted-foreground shrink-0">({abilityShort})</span>
        </>
      }
      mod={mod}
      bonus={bonus}
      isProficient={isProficient}
      onToggle={handleToggle}
    />
  );
}

export function SkillsSection() {
  return (
    <FormSection title="Skills" iconCategory="skill" iconName="athletics">
      <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-0.5">
        {COMMON_SKILLS.map((skill) => (
          <SkillRow key={skill} skill={skill} />
        ))}
      </div>
    </FormSection>
  );
}

export function DamageResistancesSection() {
  const { setValue, control } = useFormContext<Entity>();
  const gameEnums = useGameEnums();
  const { fields: resistanceFields, append: appendResistance, remove: removeResistance } = useFieldArray({
    control,
    name: "damageResistances",
  });
  const damageResistances = useWatch({ control, name: "damageResistances" });

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
                name={`damageResistances.${index}.damageType`}
                value={damageResistances?.[index]?.damageType || "bludgeoning"}
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
                name={`damageResistances.${index}.level`}
                value={damageResistances?.[index]?.level || "resistant"}
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
}

export function ConditionImmunitiesSection() {
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
}
