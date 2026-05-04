import React from "react";
import { useFormContext } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import type { Ability, AbilityEffect } from "@/types";

import { DamageSubEditor }      from "./effect-editors/DamageSubEditor";
import { HealSubEditor }        from "./effect-editors/HealSubEditor";
import { ApplyStatusSubEditor } from "./effect-editors/ApplyStatusSubEditor";
import { ModifyStatSubEditor }  from "./effect-editors/ModifyStatSubEditor";
import {
  SummonSubEditor, TransformSubEditor,
  MoveSubEditor, AoeSubEditor, CustomSubEditor,
} from "./effect-editors/RemainingSubEditors";

const DEFAULT_BY_TYPE: Record<AbilityEffect["type"], AbilityEffect> = {
  damage:       { type: "damage",       formula: "1d8",    damageType: "bludgeoning" },
  heal:         { type: "heal",         formula: "2d8" },
  applyStatus:  { type: "applyStatus",  statusId: "",      duration: "1 minute", savingThrow: null },
  modifyStat:   { type: "modifyStat",   attribute: "strength", value: { type: "flat", value: 2 }, durationRounds: 10 },
  summon:       { type: "summon",       entityId: "",      quantity: "1" },
  transform:    { type: "transform",    targetEntityId: "", duration: "1 hour", revertOnDeath: true },
  move:         { type: "move",         distance: 10,      direction: "forward" },
  areaOfEffect: { type: "areaOfEffect", shape: "sphere",   range: 20, effects: [] },
  custom:       { type: "custom",       description: "",   data: {} },
};

interface AbilityEffectEditorProps {
  index: number;
  remove: (index: number) => void;
}

export const AbilityEffectEditor: React.FC<AbilityEffectEditorProps> = ({ index, remove }) => {
  const { watch, setValue } = useFormContext<Ability>();
  const effect = watch(`effects.${index}`);
  const effectType = effect?.type ?? "custom";
  const typeSelectId = `effect-${index}-type`;

  if (!effect || typeof effect !== "object") {
    return (
      <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-destructive">Invalid Effect #{index + 1}</h4>
          <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">This effect has invalid data. Remove it and add a new one.</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">Effect #{index + 1}</h4>
        <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Switching type resets the effect to valid defaults for that type */}
      <div className="space-y-2">
        <Label htmlFor={typeSelectId}>Effect Type</Label>
        <Select
          value={effectType}
          onValueChange={(type: AbilityEffect["type"]) =>
            setValue(`effects.${index}`, DEFAULT_BY_TYPE[type], { shouldDirty: true })
          }
        >
          <SelectTrigger id={typeSelectId}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="damage">Damage</SelectItem>
            <SelectItem value="heal">Heal</SelectItem>
            <SelectItem value="applyStatus">Apply Status</SelectItem>
            <SelectItem value="modifyStat">Modify Stat</SelectItem>
            <SelectItem value="summon">Summon Creature</SelectItem>
            <SelectItem value="transform">Transform</SelectItem>
            <SelectItem value="move">Move Target</SelectItem>
            <SelectItem value="areaOfEffect">Area of Effect</SelectItem>
            <SelectItem value="custom">Custom Effect</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {effectType === "damage"       && <DamageSubEditor      index={index} />}
      {effectType === "heal"         && <HealSubEditor        index={index} />}
      {effectType === "applyStatus"  && <ApplyStatusSubEditor index={index} />}
      {effectType === "modifyStat"   && <ModifyStatSubEditor  index={index} />}
      {effectType === "summon"       && <SummonSubEditor      index={index} />}
      {effectType === "transform"    && <TransformSubEditor   index={index} />}
      {effectType === "move"         && <MoveSubEditor        index={index} />}
      {effectType === "areaOfEffect" && <AoeSubEditor         index={index} />}
      {effectType === "custom"       && <CustomSubEditor      index={index} />}
    </div>
  );
};
