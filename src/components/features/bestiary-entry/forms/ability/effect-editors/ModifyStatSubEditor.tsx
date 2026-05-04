import React from "react";
import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGameEnums } from "@/store/appStore";
import { ABILITY_SCORE_LABELS } from "@/lib/dnd/constants";
import type { Ability, Attribute } from "@/types";

export const ModifyStatSubEditor: React.FC<{ index: number }> = ({ index }) => {
  const { watch, setValue } = useFormContext<Ability>();
  const gameEnums = useGameEnums();
  const effect = watch(`effects.${index}`);
  if (effect.type !== "modifyStat") return null;

  const attrId = `effect-${index}-stat-attr`;
  const modTypeId = `effect-${index}-stat-mod-type`;
  const valueId = `effect-${index}-stat-value`;
  const durationId = `effect-${index}-stat-duration`;

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={attrId}>Attribute</Label>
        <Select
          value={effect.attribute}
          onValueChange={(v: Attribute) => setValue(`effects.${index}.attribute`, v, { shouldDirty: true })}
        >
          <SelectTrigger id={attrId}><SelectValue /></SelectTrigger>
          <SelectContent>
            {gameEnums?.attributes.map((attr) => (
              <SelectItem key={attr} value={attr}>{ABILITY_SCORE_LABELS[attr]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={modTypeId}>Modifier Type</Label>
          <Select
            value={effect.value.type}
            onValueChange={(type: "flat" | "percentAdd" | "percentMult") =>
              setValue(`effects.${index}.value`, { ...effect.value, type }, { shouldDirty: true })
            }
          >
            <SelectTrigger id={modTypeId}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="flat">Flat Bonus</SelectItem>
              <SelectItem value="percentAdd">Additive %</SelectItem>
              <SelectItem value="percentMult">Multiplicative %</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor={valueId}>Value</Label>
          <Input
            id={valueId}
            type="number"
            value={effect.value.value}
            onChange={(e) =>
              setValue(`effects.${index}.value`, { ...effect.value, value: parseFloat(e.target.value) || 0 }, { shouldDirty: true })
            }
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor={durationId}>Duration (rounds)</Label>
        <Input
          id={durationId}
          type="number"
          value={effect.durationRounds}
          min={1}
          onChange={(e) =>
            setValue(`effects.${index}.durationRounds`, parseInt(e.target.value) || 1, { shouldDirty: true })
          }
        />
      </div>
    </>
  );
};
