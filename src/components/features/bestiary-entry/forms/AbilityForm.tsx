import React from "react";
import { useFormContext, useFieldArray } from "react-hook-form";
import { FormSection } from "@/components/forms/FormSection";
import { FormInput } from "@/components/forms/FormPrimitives";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor } from "@/components/shared/RichTextEditor";
import { useGameEnums } from "@/store/appStore";
import { ABILITY_TYPE_LABELS, AOE_SHAPE_LABELS } from "@/lib/dnd/constants";
import { AbilityEffectEditor } from "./ability";
import type { Ability, AbilityType, AoeShape } from "@/types";

export const AbilityForm: React.FC = () => {
  const {
    register,
    control,
    watch,
    setValue,
  } = useFormContext<Ability>();
  const gameEnums = useGameEnums();

  const { fields: effectFields, append: appendEffect, remove: removeEffect } = useFieldArray({
    control,
    name: "effects",
  });

  const target = watch("target");
  const targetType = target?.type || null;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <FormSection title="Ability Details" iconCategory="game" iconName="spell">
        <FormInput<Ability> name="name" label="Name" placeholder="Fireball" autoFocus />
        <FormInput<Ability> name="slug" label="Slug" placeholder="fireball" />

        <div className="space-y-2">
          <Label>Type</Label>
          <Select
            value={watch("type") || "passive"}
            onValueChange={(value: AbilityType) =>
              setValue("type", value, { shouldDirty: true })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {gameEnums?.abilityTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {ABILITY_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="castingTime">Casting Time</Label>
          <Input
            id="castingTime"
            {...register("castingTime")}
            placeholder="e.g., 1 action, 1 bonus action, 1 reaction"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="recharge">Recharge</Label>
          <Input
            id="recharge"
            {...register("recharge")}
            placeholder="e.g., 5-6, short rest, long rest"
          />
        </div>

        <div className="col-span-full flex items-center space-x-2">
          <Checkbox
            id="requiresConcentration"
            checked={watch("requiresConcentration") || false}
            onCheckedChange={(checked) =>
              setValue("requiresConcentration", !!checked, { shouldDirty: true })
            }
          />
          <Label htmlFor="requiresConcentration" className="cursor-pointer">
            Requires Concentration
          </Label>
        </div>
      </FormSection>

      <FormSection title="Targeting" iconCategory="combat" iconName="target">
        <div className="col-span-full space-y-4">
          <div className="space-y-2">
            <Label>Target Type</Label>
            <Select
              value={targetType || "none"}
              onValueChange={(value) => {
                if (value === "none") {
                  setValue("target", null, { shouldDirty: true });
                } else if (value === "selfTarget") {
                  setValue("target", { type: "selfTarget" }, { shouldDirty: true });
                } else if (value === "target") {
                  setValue("target", { type: "target", range: 30, count: 1 }, { shouldDirty: true });
                } else if (value === "area") {
                  setValue("target", { type: "area", shape: "sphere", range: 30 }, { shouldDirty: true });
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="No targeting (passive)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (Passive)</SelectItem>
                <SelectItem value="selfTarget">Self</SelectItem>
                <SelectItem value="target">Target(s)</SelectItem>
                <SelectItem value="area">Area of Effect</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {targetType === "target" && target?.type === "target" && (
            <div className="grid grid-cols-2 gap-4 ml-4">
              <div className="space-y-2">
                <Label>Range (feet)</Label>
                <Input
                  type="number"
                  value={target.range}
                  onChange={(e) =>
                    setValue("target", { ...target, range: parseInt(e.target.value) || 0 }, { shouldDirty: true })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Target Count</Label>
                <Input
                  type="number"
                  value={target.count}
                  onChange={(e) =>
                    setValue("target", { ...target, count: parseInt(e.target.value) || 1 }, { shouldDirty: true })
                  }
                />
              </div>
            </div>
          )}

          {targetType === "area" && target?.type === "area" && (
            <div className="grid grid-cols-2 gap-4 ml-4">
              <div className="space-y-2">
                <Label>Shape</Label>
                <Select
                  value={target.shape}
                  onValueChange={(shape: AoeShape) =>
                    setValue("target", { ...target, shape }, { shouldDirty: true })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {gameEnums?.aoeShapes.map((shape) => (
                      <SelectItem key={shape} value={shape}>
                        {AOE_SHAPE_LABELS[shape]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Range (feet)</Label>
                <Input
                  type="number"
                  value={target.range}
                  onChange={(e) =>
                    setValue("target", { ...target, range: parseInt(e.target.value) || 0 }, { shouldDirty: true })
                  }
                />
              </div>
            </div>
          )}
        </div>
      </FormSection>

      <FormSection title="Spell Components" iconCategory="spell" iconName="vocal">
        <div className="col-span-full space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="hasComponents"
              checked={watch("components") !== null}
              onCheckedChange={(checked) => {
                if (checked) {
                  setValue("components", { verbal: false, somatic: false, material: null }, { shouldDirty: true });
                } else {
                  setValue("components", null, { shouldDirty: true });
                }
              }}
            />
            <Label htmlFor="hasComponents" className="cursor-pointer">
              This ability has spell components
            </Label>
          </div>

          {watch("components") !== null && (
            <div className="ml-6 space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="verbal"
                  checked={watch("components.verbal") || false}
                  onCheckedChange={(checked) =>
                    setValue("components.verbal", !!checked, { shouldDirty: true })
                  }
                />
                <Label htmlFor="verbal" className="cursor-pointer">
                  Verbal (V)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="somatic"
                  checked={watch("components.somatic") || false}
                  onCheckedChange={(checked) =>
                    setValue("components.somatic", !!checked, { shouldDirty: true })
                  }
                />
                <Label htmlFor="somatic" className="cursor-pointer">
                  Somatic (S)
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="material">Material Components (M)</Label>
                <Input
                  id="material"
                  {...register("components.material")}
                  placeholder="e.g., a tiny ball of bat guano and sulfur"
                />
              </div>
            </div>
          )}
        </div>
      </FormSection>

      <FormSection title="Effects" iconCategory="dice" iconName="roll">
        <div className="col-span-full space-y-4">
          <div className="flex items-center justify-between">
            <Label>Ability Effects</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                appendEffect({ type: "custom", description: "", data: {} })
              }
            >
              Add Effect
            </Button>
          </div>

          {effectFields.map((field, index) => (
            <AbilityEffectEditor
              key={field.id}
              index={index}
              remove={removeEffect}
            />
          ))}

          {effectFields.length === 0 && (
            <p className="text-sm text-muted-foreground italic">
              No effects added yet. Click "Add Effect" to begin.
            </p>
          )}
        </div>
      </FormSection>

      <FormSection title="Description" iconCategory="ui" iconName="book">
        <div className="col-span-full">
          <RichTextEditor
            content={watch("description") || ""}
            onChange={(html) =>
              setValue("description", html, { shouldDirty: true })
            }
          />
        </div>
      </FormSection>
    </div>
  );
};
