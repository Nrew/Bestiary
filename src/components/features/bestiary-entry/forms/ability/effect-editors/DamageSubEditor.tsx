import React from "react";
import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGameEnums } from "@/store/appStore";
import { DAMAGE_TYPE_LABELS } from "@/lib/dnd/constants";
import type { Ability, DamageType } from "@/types";

export const DamageSubEditor: React.FC<{ index: number }> = ({ index }) => {
  const { register, watch, setValue } = useFormContext<Ability>();
  const gameEnums = useGameEnums();
  const formulaId = `effect-${index}-damage-formula`;
  const damageTypeId = `effect-${index}-damage-type`;

  const effect = watch(`effects.${index}`);
  const damageType: DamageType =
    effect?.type === "damage" ? effect.damageType : "bludgeoning";

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={formulaId}>Damage Formula</Label>
        <Input id={formulaId} {...register(`effects.${index}.formula`)} placeholder="e.g., 2d6 + 3" autoComplete="off" />
      </div>
      <div className="space-y-2">
        <Label htmlFor={damageTypeId}>Damage Type</Label>
        <Select
          value={damageType}
          onValueChange={(v: DamageType) => setValue(`effects.${index}.damageType`, v, { shouldDirty: true })}
        >
          <SelectTrigger id={damageTypeId}><SelectValue /></SelectTrigger>
          <SelectContent>
            {gameEnums?.damageTypes.map((type) => (
              <SelectItem key={type} value={type}>{DAMAGE_TYPE_LABELS[type]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
};
