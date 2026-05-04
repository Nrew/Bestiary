import React from "react";
import { useFormContext, useFieldArray } from "react-hook-form";
import { FormSection } from "@/components/forms/FormSection";
import { FormEntryPicker } from "@/components/forms/FormPrimitives";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGameEnums } from "@/store/appStore";
import { Trash2 } from "lucide-react";
import {
  ABILITY_SCORE_NAMES,
  ABILITY_SCORE_LABELS,
  COMMON_SKILLS,
  SKILL_LABELS,
  DAMAGE_TYPE_LABELS,
  RESISTANCE_LEVEL_LABELS,
} from "@/lib/dnd/constants";
import { cn } from "@/lib/utils";
import type { Entity, DamageType, ResistanceLevel } from "@/types";
import type { Path } from "react-hook-form";
import type { IconCategory } from "@/lib/dnd/icon-resolver";


interface NumericInputListSectionProps {
  title: string;
  iconCategory: IconCategory;
  iconName: string;
  description: string;
  fieldPrefix: string;
  items: readonly string[];
  labels: Record<string, string>;
  gridClass: string;
}

const NumericInputListSection: React.FC<NumericInputListSectionProps> = ({
  title,
  iconCategory,
  iconName,
  description,
  fieldPrefix,
  items,
  labels,
  gridClass,
}) => {
  const { register } = useFormContext<Entity>();

  return (
    <FormSection title={title} iconCategory={iconCategory} iconName={iconName}>
      <div className="col-span-full space-y-4">
        <p className="text-sm text-muted-foreground">{description}</p>
        <div className={cn("grid gap-4", gridClass)}>
          {items.map((item) => (
            <div key={item} className="space-y-2">
              <Label htmlFor={`${fieldPrefix}.${item}`}>{labels[item]}</Label>
              <Input
                id={`${fieldPrefix}.${item}`}
                type="number"
                {...register(`${fieldPrefix}.${item}` as Path<Entity>, { valueAsNumber: true })}
                placeholder="e.g., +3"
              />
            </div>
          ))}
        </div>
      </div>
    </FormSection>
  );
};


export const SavingThrowsSection: React.FC = () => (
  <NumericInputListSection
    title="Saving Throws"
    iconCategory="d20test"
    iconName="saving-throw"
    description="Only add saving throws where the creature has proficiency (values should include proficiency bonus)"
    fieldPrefix="savingThrows"
    items={ABILITY_SCORE_NAMES}
    labels={ABILITY_SCORE_LABELS}
    gridClass="grid-cols-2 md:grid-cols-3"
  />
);

export const SkillsSection: React.FC = () => (
  <NumericInputListSection
    title="Skills"
    iconCategory="skill"
    iconName="athletics"
    description="Only add skills where the creature has proficiency or expertise"
    fieldPrefix="skills"
    items={COMMON_SKILLS}
    labels={SKILL_LABELS}
    gridClass="grid-cols-1 md:grid-cols-2"
  />
);

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
              <Label id={`damage-resistance-${index}-type-label`}>Damage Type</Label>
              <Select
                value={watch(`damageResistances.${index}.damageType`) || "bludgeoning"}
                onValueChange={(value: DamageType) =>
                  setValue(`damageResistances.${index}.damageType`, value, { shouldDirty: true })
                }
              >
                <SelectTrigger aria-labelledby={`damage-resistance-${index}-type-label`}>
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
              <Label>Level</Label>
              <Select
                value={watch(`damageResistances.${index}.level`) || "resistant"}
                onValueChange={(value: ResistanceLevel) =>
                  setValue(`damageResistances.${index}.level`, value, { shouldDirty: true })
                }
              >
                <SelectTrigger>
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
