import React from "react";
import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGameEnums } from "@/store/appStore";
import { ABILITY_SCORE_LABELS } from "@/lib/dnd/constants";
import { SingleEntryPicker } from "../SingleEntryPicker";
import type { Ability, Attribute } from "@/types";

export const ApplyStatusSubEditor: React.FC<{ index: number }> = ({ index }) => {
  const { register, watch, setValue } = useFormContext<Ability>();
  const gameEnums = useGameEnums();
  const effect = watch(`effects.${index}`);
  if (effect.type !== "applyStatus") return null;

  const durationId = `effect-${index}-status-duration`;
  const savingThrowId = `savingThrow-${index}`;
  const dcId = `effect-${index}-st-dc`;

  return (
    <>
      <SingleEntryPicker
        label="Status Effect"
        value={effect.statusId}
        onChange={(id) => setValue(`effects.${index}.statusId`, id, { shouldDirty: true })}
        context="statuses"
      />
      <div className="space-y-2">
        <Label htmlFor={durationId}>Duration</Label>
        <Input id={durationId} {...register(`effects.${index}.duration`)} placeholder="e.g., 1 minute, 5 rounds" autoComplete="off" />
      </div>
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id={savingThrowId}
            checked={effect.savingThrow !== null}
            onCheckedChange={(checked) =>
              setValue(
                `effects.${index}.savingThrow`,
                checked ? { dc: 15, attribute: "constitution" } : null,
                { shouldDirty: true }
              )
            }
          />
          <Label htmlFor={savingThrowId} className="cursor-pointer">Allows saving throw</Label>
        </div>
        {effect.savingThrow && (
          <div className="ml-6 grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={dcId}>DC</Label>
              <Input
                id={dcId}
                type="number"
                value={effect.savingThrow.dc}
                onChange={(e) =>
                  setValue(`effects.${index}.savingThrow.dc`, parseInt(e.target.value), { shouldDirty: true })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Attribute</Label>
              <Select
                value={effect.savingThrow.attribute}
                onValueChange={(v: Attribute) =>
                  setValue(`effects.${index}.savingThrow.attribute`, v, { shouldDirty: true })
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {gameEnums?.attributes.map((attr) => (
                    <SelectItem key={attr} value={attr}>{ABILITY_SCORE_LABELS[attr]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
