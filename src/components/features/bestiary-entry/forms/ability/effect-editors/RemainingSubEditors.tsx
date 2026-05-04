import React from "react";
import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGameEnums } from "@/store/appStore";
import { AOE_SHAPE_LABELS } from "@/lib/dnd/constants";
import { SingleEntryPicker } from "../SingleEntryPicker";
import { NestedEffectsEditor } from "../NestedEffectsEditor";
import { KeyValueEditor } from "../KeyValueEditor";
import type { Ability, AoeShape } from "@/types";

export const SummonSubEditor: React.FC<{ index: number }> = ({ index }) => {
  const { register, watch, setValue } = useFormContext<Ability>();
  const effect = watch(`effects.${index}`);
  if (effect.type !== "summon") return null;
  const quantityId = `effect-${index}-summon-qty`;

  return (
    <>
      <SingleEntryPicker
        label="Entity to Summon"
        value={effect.entityId}
        onChange={(id) => setValue(`effects.${index}.entityId`, id, { shouldDirty: true })}
        context="entities"
      />
      <div className="space-y-2">
        <Label htmlFor={quantityId}>Quantity</Label>
        <Input id={quantityId} {...register(`effects.${index}.quantity`)} placeholder="e.g., 1, 1d4" autoComplete="off" />
      </div>
    </>
  );
};

export const TransformSubEditor: React.FC<{ index: number }> = ({ index }) => {
  const { register, watch, setValue } = useFormContext<Ability>();
  const effect = watch(`effects.${index}`);
  if (effect.type !== "transform") return null;
  const durationId = `effect-${index}-transform-duration`;
  const revertId = `revertOnDeath-${index}`;

  return (
    <>
      <SingleEntryPicker
        label="Transform Into"
        value={effect.targetEntityId}
        onChange={(id) => setValue(`effects.${index}.targetEntityId`, id, { shouldDirty: true })}
        context="entities"
      />
      <div className="space-y-2">
        <Label htmlFor={durationId}>Duration</Label>
        <Input id={durationId} {...register(`effects.${index}.duration`)} placeholder="e.g., 1 hour" autoComplete="off" />
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox
          id={revertId}
          checked={effect.revertOnDeath}
          onCheckedChange={(checked) =>
            setValue(`effects.${index}.revertOnDeath`, !!checked, { shouldDirty: true })
          }
        />
        <Label htmlFor={revertId} className="cursor-pointer">Revert on 0 HP</Label>
      </div>
    </>
  );
};

export const MoveSubEditor: React.FC<{ index: number }> = ({ index }) => {
  const { register, watch, setValue } = useFormContext<Ability>();
  const effect = watch(`effects.${index}`);
  if (effect.type !== "move") return null;
  const distId = `effect-${index}-move-dist`;
  const dirId = `effect-${index}-move-dir`;

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor={distId}>Distance (feet)</Label>
        <Input
          id={distId}
          type="number"
          value={effect.distance}
          min={1}
          onChange={(e) =>
            setValue(`effects.${index}.distance`, parseInt(e.target.value) || 1, { shouldDirty: true })
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={dirId}>Direction</Label>
        <Input id={dirId} {...register(`effects.${index}.direction`)} placeholder="e.g., forward, away, toward caster" autoComplete="off" />
      </div>
    </div>
  );
};

export const AoeSubEditor: React.FC<{ index: number }> = ({ index }) => {
  const { watch, setValue } = useFormContext<Ability>();
  const gameEnums = useGameEnums();
  const effect = watch(`effects.${index}`);
  if (effect.type !== "areaOfEffect") return null;
  const shapeId = `effect-${index}-aoe-shape`;
  const rangeId = `effect-${index}-aoe-range`;

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={shapeId}>Shape</Label>
          <Select
            value={effect.shape}
            onValueChange={(shape: AoeShape) => setValue(`effects.${index}.shape`, shape, { shouldDirty: true })}
          >
            <SelectTrigger id={shapeId}><SelectValue /></SelectTrigger>
            <SelectContent>
              {gameEnums?.aoeShapes.map((shape) => (
                <SelectItem key={shape} value={shape}>{AOE_SHAPE_LABELS[shape]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor={rangeId}>Range (feet)</Label>
          <Input
            id={rangeId}
            type="number"
            value={effect.range}
            min={1}
            onChange={(e) =>
              setValue(`effects.${index}.range`, parseInt(e.target.value) || 1, { shouldDirty: true })
            }
          />
        </div>
      </div>
      <NestedEffectsEditor parentIndex={index} />
    </>
  );
};

export const CustomSubEditor: React.FC<{ index: number }> = ({ index }) => {
  const { register, watch, setValue } = useFormContext<Ability>();
  const effect = watch(`effects.${index}`);
  if (effect.type !== "custom") return null;
  const descId = `effect-${index}-custom-desc`;

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={descId}>Description</Label>
        <Input id={descId} {...register(`effects.${index}.description`)} placeholder="Describe the effect" autoComplete="off" />
      </div>
      <KeyValueEditor
        label="Custom Data"
        value={effect.data || {}}
        onChange={(data) => setValue(`effects.${index}.data`, data, { shouldDirty: true })}
      />
    </>
  );
};
