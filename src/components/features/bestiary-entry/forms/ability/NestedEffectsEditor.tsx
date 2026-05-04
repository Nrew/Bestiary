import React from "react";
import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import { useGameEnums } from "@/store/appStore";
import { DAMAGE_TYPE_LABELS } from "@/lib/dnd/constants";
import type { Ability, AbilityEffect, DamageType } from "@/types";

interface NestedEffectsEditorProps {
  parentIndex: number;
}

/**
 * Minimal effect editor for nested AoE sub-effects. Caps depth at 1: an
 * `areaOfEffect` parent contains a flat list of damage/heal/applyStatus/
 * modifyStat/move/custom children; an AoE inside an AoE is intentionally
 * not allowed (the type picker omits it).
 */
export const NestedEffectsEditor: React.FC<NestedEffectsEditorProps> = ({ parentIndex }) => {
  const { watch, setValue } = useFormContext<Ability>();
  const gameEnums = useGameEnums();
  const nestedEffects: AbilityEffect[] = watch(`effects.${parentIndex}.effects`) || [];

  const addNestedEffect = () => {
    setValue(
      `effects.${parentIndex}.effects`,
      [...nestedEffects, { type: "damage", formula: "1d8", damageType: "bludgeoning" }],
      { shouldDirty: true }
    );
  };

  const removeNestedEffect = (subIndex: number) => {
    setValue(
      `effects.${parentIndex}.effects`,
      nestedEffects.filter((_, i) => i !== subIndex),
      { shouldDirty: true }
    );
  };

  const updateNestedEffect = (subIndex: number, effect: AbilityEffect) => {
    const updated = [...nestedEffects];
    updated[subIndex] = effect;
    setValue(`effects.${parentIndex}.effects`, updated, { shouldDirty: true });
  };

  return (
    <div className="space-y-2 mt-2">
      <Label className="font-semibold text-sm">Area Sub-Effects</Label>
      {nestedEffects.length === 0 && (
        <p className="text-xs text-muted-foreground italic">No sub-effects. Add effects that apply within the area.</p>
      )}
      {nestedEffects.map((sub, subIndex) => (
        <div key={subIndex} className="border border-border/50 rounded-md p-3 space-y-3 bg-muted/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Sub-effect #{subIndex + 1}</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => removeNestedEffect(subIndex)}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Type</Label>
            <Select
              value={sub.type}
              onValueChange={(type: AbilityEffect["type"]) => {
                if (type === "areaOfEffect") return; // prevent infinite nesting
                const defaults: Record<string, AbilityEffect> = {
                  damage: { type: "damage", formula: "1d8", damageType: "bludgeoning" },
                  heal: { type: "heal", formula: "2d8" },
                  applyStatus: { type: "applyStatus", statusId: "", duration: "1 minute", savingThrow: null },
                  modifyStat: { type: "modifyStat", attribute: "strength", value: { type: "flat", value: 2 }, durationRounds: 10 },
                  move: { type: "move", distance: 10, direction: "forward" },
                  custom: { type: "custom", description: "", data: {} },
                };
                updateNestedEffect(subIndex, (defaults[type] ?? defaults.custom));
              }}
            >
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="damage">Damage</SelectItem>
                <SelectItem value="heal">Heal</SelectItem>
                <SelectItem value="applyStatus">Apply Status</SelectItem>
                <SelectItem value="modifyStat">Modify Stat</SelectItem>
                <SelectItem value="move">Move Target</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {sub.type === "damage" && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Formula</Label>
                <Input className="h-8 text-xs" value={sub.formula}
                  onChange={(e) => updateNestedEffect(subIndex, { ...sub, formula: e.target.value })}
                  placeholder="e.g., 2d6" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Damage Type</Label>
                <Select value={sub.damageType}
                  onValueChange={(t: DamageType) => updateNestedEffect(subIndex, { ...sub, damageType: t })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {gameEnums?.damageTypes.map((t) => (
                      <SelectItem key={t} value={t}>{DAMAGE_TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          {sub.type === "heal" && (
            <div className="space-y-1">
              <Label className="text-xs">Heal Formula</Label>
              <Input className="h-8 text-xs" value={sub.formula}
                onChange={(e) => updateNestedEffect(subIndex, { ...sub, formula: e.target.value })}
                placeholder="e.g., 2d8 + 3" />
            </div>
          )}
          {sub.type === "custom" && (
            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Input className="h-8 text-xs" value={sub.description}
                onChange={(e) => updateNestedEffect(subIndex, { ...sub, description: e.target.value })}
                placeholder="Describe the effect" />
            </div>
          )}
          {sub.type === "move" && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Distance (ft)</Label>
                <Input className="h-8 text-xs" type="number" value={sub.distance} min={1}
                  onChange={(e) => updateNestedEffect(subIndex, { ...sub, distance: parseInt(e.target.value) || 5 })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Direction</Label>
                <Input className="h-8 text-xs" value={sub.direction}
                  onChange={(e) => updateNestedEffect(subIndex, { ...sub, direction: e.target.value })}
                  placeholder="e.g., away" />
              </div>
            </div>
          )}
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="w-full text-xs" onClick={addNestedEffect}>
        <Plus className="w-3 h-3 mr-1" /> Add Area Sub-Effect
      </Button>
    </div>
  );
};