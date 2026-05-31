import React, { useMemo } from "react";
import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import { useGameEnums } from "@/store/appStore";
import { DAMAGE_TYPE_LABELS, ABILITY_SCORE_LABELS } from "@/lib/dnd/constants";
import { SingleEntryPicker } from "./SingleEntryPicker";
import type { Ability, AbilityEffect, DamageType, Attribute } from "@/types";

interface NestedEffectsEditorProps {
  parentIndex: number;
}

const NESTED_EFFECT_DEFAULTS: Record<string, AbilityEffect> = {
  damage: { type: "damage", formula: "1d8", damageType: "bludgeoning" },
  heal: { type: "heal", formula: "2d8" },
  applyStatus: { type: "applyStatus", statusId: "", duration: "1 minute", savingThrow: null },
  modifyStat: { type: "modifyStat", attribute: "strength", value: { type: "flat", value: 2 }, durationRounds: 10 },
  move: { type: "move", distance: 10, direction: "forward" },
  custom: { type: "custom", description: "", data: {} },
};

/**
 * Minimal effect editor for nested AoE sub-effects. Caps depth at 1: an
 * `areaOfEffect` parent contains a flat list of damage/heal/applyStatus/
 * modifyStat/move/custom children; an AoE inside an AoE is intentionally
 * not allowed (the type picker omits it).
 */
export function NestedEffectsEditor({ parentIndex }: NestedEffectsEditorProps) {
  const { watch, setValue } = useFormContext<Ability>();
  const gameEnums = useGameEnums();
  const nestedEffects: AbilityEffect[] = watch(`effects.${parentIndex}.effects`) || [];
  const idsRef = React.useRef<string[]>([]);

  const effectIds = useMemo(() => {
    const prev = idsRef.current;
    const next = nestedEffects.map((_, i) => prev[i] ?? crypto.randomUUID());
    idsRef.current = next;
    return next;
  }, [nestedEffects.length]); // eslint-disable-line react-hooks/exhaustive-deps

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
    idsRef.current = idsRef.current.filter((_, i) => i !== subIndex);
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
        <div key={effectIds[subIndex]} className="border border-border/50 rounded-md p-3 space-y-3 bg-muted/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Sub-effect #{subIndex + 1}</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => removeNestedEffect(subIndex)}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`nested-effect-${parentIndex}-${subIndex}-type`} className="text-xs">Type</Label>
            <Select
              name={`effects.${parentIndex}.effects.${subIndex}.type`}
              value={sub.type}
              onValueChange={(type: AbilityEffect["type"]) => {
                if (type === "areaOfEffect") return; // prevent infinite nesting
                updateNestedEffect(subIndex, (NESTED_EFFECT_DEFAULTS[type] ?? NESTED_EFFECT_DEFAULTS.custom));
              }}
            >
              <SelectTrigger id={`nested-effect-${parentIndex}-${subIndex}-type`} className="h-8 text-xs"><SelectValue /></SelectTrigger>
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
                <Label htmlFor={`nested-effect-${parentIndex}-${subIndex}-damage-formula`} className="text-xs">Formula</Label>
                <Input
                  id={`nested-effect-${parentIndex}-${subIndex}-damage-formula`}
                  name={`effects.${parentIndex}.effects.${subIndex}.formula`}
                  className="h-8 text-xs"
                  value={sub.formula}
                  onChange={(e) => updateNestedEffect(subIndex, { ...sub, formula: e.target.value })}
                  placeholder="e.g., 2d6" />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`nested-effect-${parentIndex}-${subIndex}-damage-type`} className="text-xs">Damage Type</Label>
                <Select
                  name={`effects.${parentIndex}.effects.${subIndex}.damageType`}
                  value={sub.damageType}
                  onValueChange={(t: DamageType) => updateNestedEffect(subIndex, { ...sub, damageType: t })}>
                  <SelectTrigger id={`nested-effect-${parentIndex}-${subIndex}-damage-type`} className="h-8 text-xs"><SelectValue /></SelectTrigger>
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
              <Label htmlFor={`nested-effect-${parentIndex}-${subIndex}-heal-formula`} className="text-xs">Heal Formula</Label>
              <Input
                id={`nested-effect-${parentIndex}-${subIndex}-heal-formula`}
                name={`effects.${parentIndex}.effects.${subIndex}.formula`}
                className="h-8 text-xs"
                value={sub.formula}
                onChange={(e) => updateNestedEffect(subIndex, { ...sub, formula: e.target.value })}
                placeholder="e.g., 2d8 + 3" />
            </div>
          )}
          {sub.type === "applyStatus" && (
            <div className="space-y-2">
              <SingleEntryPicker
                label="Status Effect"
                value={sub.statusId}
                onChange={(id) => updateNestedEffect(subIndex, { ...sub, statusId: id })}
                context="statuses"
              />
              <div className="space-y-1">
                <Label htmlFor={`nested-effect-${parentIndex}-${subIndex}-status-duration`} className="text-xs">Duration</Label>
                <Input
                  id={`nested-effect-${parentIndex}-${subIndex}-status-duration`}
                  name={`effects.${parentIndex}.effects.${subIndex}.duration`}
                  className="h-8 text-xs"
                  value={sub.duration}
                  onChange={(e) => updateNestedEffect(subIndex, { ...sub, duration: e.target.value })}
                  placeholder="e.g., 1 minute, 5 rounds" />
              </div>
            </div>
          )}
          {sub.type === "modifyStat" && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor={`nested-effect-${parentIndex}-${subIndex}-modstat-attr`} className="text-xs">Attribute</Label>
                  <Select
                    name={`effects.${parentIndex}.effects.${subIndex}.attribute`}
                    value={sub.attribute}
                    onValueChange={(v: Attribute) => updateNestedEffect(subIndex, { ...sub, attribute: v })}>
                    <SelectTrigger id={`nested-effect-${parentIndex}-${subIndex}-modstat-attr`} className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {gameEnums?.attributes.map((attr) => (
                        <SelectItem key={attr} value={attr}>{ABILITY_SCORE_LABELS[attr]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`nested-effect-${parentIndex}-${subIndex}-modstat-value`} className="text-xs">Value</Label>
                  <Input
                    id={`nested-effect-${parentIndex}-${subIndex}-modstat-value`}
                    name={`effects.${parentIndex}.effects.${subIndex}.value.value`}
                    className="h-8 text-xs"
                    type="number"
                    value={sub.value.value}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      updateNestedEffect(subIndex, { ...sub, value: { ...sub.value, value: Number.isFinite(v) ? v : 0 } });
                    }} />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor={`nested-effect-${parentIndex}-${subIndex}-modstat-duration`} className="text-xs">Duration (rounds)</Label>
                <Input
                  id={`nested-effect-${parentIndex}-${subIndex}-modstat-duration`}
                  name={`effects.${parentIndex}.effects.${subIndex}.durationRounds`}
                  className="h-8 text-xs"
                  type="number"
                  value={sub.durationRounds}
                  min={1}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    updateNestedEffect(subIndex, { ...sub, durationRounds: Number.isFinite(v) ? Math.max(1, v) : 1 });
                  }} />
              </div>
            </div>
          )}
          {sub.type === "custom" && (
            <div className="space-y-1">
              <Label htmlFor={`nested-effect-${parentIndex}-${subIndex}-description`} className="text-xs">Description</Label>
              <Input
                id={`nested-effect-${parentIndex}-${subIndex}-description`}
                name={`effects.${parentIndex}.effects.${subIndex}.description`}
                className="h-8 text-xs"
                value={sub.description}
                onChange={(e) => updateNestedEffect(subIndex, { ...sub, description: e.target.value })}
                placeholder="Describe the effect" />
            </div>
          )}
          {sub.type === "move" && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor={`nested-effect-${parentIndex}-${subIndex}-distance`} className="text-xs">Distance (ft)</Label>
                <Input
                  id={`nested-effect-${parentIndex}-${subIndex}-distance`}
                  name={`effects.${parentIndex}.effects.${subIndex}.distance`}
                  className="h-8 text-xs"
                  type="number"
                  value={sub.distance}
                  min={1}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    updateNestedEffect(subIndex, { ...sub, distance: Number.isFinite(v) ? v : 5 });
                  }} />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`nested-effect-${parentIndex}-${subIndex}-direction`} className="text-xs">Direction</Label>
                <Input
                  id={`nested-effect-${parentIndex}-${subIndex}-direction`}
                  name={`effects.${parentIndex}.effects.${subIndex}.direction`}
                  className="h-8 text-xs"
                  value={sub.direction}
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
}
