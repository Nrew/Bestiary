import { Controller, useFormContext, useFieldArray, useWatch } from "react-hook-form";
import { FormSection } from "@/components/forms/FormSection";
import { FormInput } from "@/components/forms/FormPrimitives";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor } from "@/components/shared/RichTextEditor";
import { DeferredMount } from "@/components/shared/DeferredMount";
import { Skeleton } from "@/components/ui/skeleton";
import { Icon } from "@/components/shared";
import { useGameEnums } from "@/store/appStore";
import { ABILITY_TIMING_LABELS, ABILITY_CATEGORY_LABELS, AOE_SHAPE_LABELS } from "@/lib/dnd/constants";
import { AbilityEffectEditor } from "./ability";
import { SpellFieldsSection } from "./ability/SpellFieldsSection";
import { UsesEditor } from "./ability/UsesEditor";
import type { AbilityCategory, AbilityTiming, AoeShape } from "@/types";
import type { AbilityFormData } from "@/types/schemas";

const RICH_TEXT_FALLBACK = (
  <Skeleton variant="shimmer" className="min-h-49.5 w-full rounded-md" aria-hidden />
);

export function AbilityForm() {
  const {
    register,
    control,
    setValue,
  } = useFormContext<AbilityFormData>();
  const gameEnums = useGameEnums();

  const { fields: effectFields, append: appendEffect, remove: removeEffect } = useFieldArray({
    control,
    name: "effects",
  });

  const timing = useWatch({ control, name: "timing" });
  const category = useWatch({ control, name: "category" });
  const target = useWatch({ control, name: "target" });
  const requiresConcentration = useWatch({ control, name: "requiresConcentration" });
  const components = useWatch({ control, name: "components" });
  const targetType = target?.type || null;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <FormSection title="Ability Details" iconCategory="game" iconName="spell">
        <FormInput<AbilityFormData> name="name" label="Name" placeholder="Fireball" autoFocus />
        <FormInput<AbilityFormData> name="slug" label="Slug" placeholder="fireball" />

        <div className="space-y-2">
          <Label htmlFor="ability-timing">Timing</Label>
          <Select
            value={timing || "passive"}
            onValueChange={(value: AbilityTiming) =>
              setValue("timing", value, { shouldDirty: true })
            }
          >
            <SelectTrigger id="ability-timing">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {gameEnums?.abilityTimings.map((t) => (
                <SelectItem key={t} value={t}>
                  {ABILITY_TIMING_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ability-category">Category</Label>
          <Select
            value={category || "none"}
            onValueChange={(value: AbilityCategory) => {
              setValue("category", value, { shouldDirty: true });
              if (value !== "none") {
                setValue("spellLevel", null, { shouldDirty: true });
                setValue("school", null, { shouldDirty: true });
                setValue("ritual", false, { shouldDirty: true });
                setValue("higherLevels", null, { shouldDirty: true });
                setValue("components", null, { shouldDirty: true });
                setValue("target", null, { shouldDirty: true });
                setValue("requiresConcentration", false, { shouldDirty: true });
                setValue("uses", null, { shouldDirty: true });
              }
              if (value === "multiattack") {
                setValue("effects", [], { shouldDirty: true });
              }
            }}
          >
            <SelectTrigger id="ability-category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {gameEnums?.abilityCategories.map((c) => (
                <SelectItem key={c} value={c}>
                  {ABILITY_CATEGORY_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {category === "none" && (
          <>
            <UsesEditor />

            <div className="col-span-full flex items-center space-x-2">
              <Checkbox
                id="requiresConcentration"
                checked={requiresConcentration || false}
                onCheckedChange={(checked) =>
                  setValue("requiresConcentration", !!checked, { shouldDirty: true })
                }
              />
              <Label htmlFor="requiresConcentration" className="cursor-pointer">
                Requires Concentration
              </Label>
            </div>
          </>
        )}
      </FormSection>

      {category === "multiattack" && (
        <aside className="flex items-start gap-2 rounded-sm border-l-2 border-sapphire/40 bg-stone/10 p-3 font-serif text-sm text-ink/70">
          <Icon category="game" name="source-book" size="sm" className="mt-0.5 shrink-0 text-sapphire/70" />
          <div>
            <strong className="font-display text-ink">Multiattack.</strong>{" "}
            Describe the attack pattern in the description. Author individual
            constituent attacks as separate Action abilities.
          </div>
        </aside>
      )}
      {category === "regionalEffect" && (
        <aside className="flex items-start gap-2 rounded-sm border-l-2 border-sapphire/40 bg-stone/10 p-3 font-serif text-sm text-ink/70">
          <Icon category="game" name="source-book" size="sm" className="mt-0.5 shrink-0 text-sapphire/70" />
          <div>
            <strong className="font-display text-ink">Regional Effect.</strong>{" "}
            Describe the ambient effect on the surrounding region. Targeting,
            components, and uses do not apply.
          </div>
        </aside>
      )}
      {category === "none" && <SpellFieldsSection />}

      {category === "none" && (
      <FormSection title="Targeting" iconCategory="combat" iconName="target">
        <div className="col-span-full space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ability-target-type">Target Type</Label>
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
              <SelectTrigger id="ability-target-type">
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

          {target?.type === "target" && (
            <div role="group" aria-label="Target details" className="grid grid-cols-2 gap-4 ml-4">
              <div className="space-y-2">
                <Label htmlFor="ability-target-range">Range (feet)</Label>
                <Input
                  id="ability-target-range"
                  name="target.range"
                  type="number"
                  value={target.range}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setValue("target", { ...target, range: Number.isFinite(v) ? v : 0 }, { shouldDirty: true });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ability-target-count">Target Count</Label>
                <Input
                  id="ability-target-count"
                  name="target.count"
                  type="number"
                  value={target.count}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setValue("target", { ...target, count: Number.isFinite(v) ? v : 1 }, { shouldDirty: true });
                  }}
                />
              </div>
            </div>
          )}

          {target?.type === "area" && (
            <div role="group" aria-label="Area of effect details" className="grid grid-cols-2 gap-4 ml-4">
              <div className="space-y-2">
                <Label htmlFor="ability-target-shape">Shape</Label>
                <Select
                  value={target.shape}
                  onValueChange={(shape: AoeShape) =>
                    setValue("target", { ...target, shape }, { shouldDirty: true })
                  }
                >
                  <SelectTrigger id="ability-target-shape">
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
                <Label htmlFor="ability-area-range">Range (feet)</Label>
                <Input
                  id="ability-area-range"
                  name="target.range"
                  type="number"
                  value={target.range}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setValue("target", { ...target, range: Number.isFinite(v) ? v : 0 }, { shouldDirty: true });
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </FormSection>
      )}

      {category === "none" && (
      <FormSection title="Spell Components" iconCategory="spell" iconName="vocal">
        <div className="col-span-full space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="hasComponents"
              checked={!!components}
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

          {!!components && (
            <div role="group" aria-label="Spell components" className="ml-6 space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="verbal"
                  checked={components.verbal || false}
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
                  checked={components.somatic || false}
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
      )}

      {category !== "multiattack" && (
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
      )}

      <FormSection title="Description" iconCategory="ui" iconName="book">
        <Controller
          control={control}
          name="description"
          render={({ field }) => (
            <DeferredMount
              ref={field.ref}
              className="col-span-full"
              fallback={RICH_TEXT_FALLBACK}
            >
              <RichTextEditor
                ariaLabel="Ability description"
                content={field.value || ""}
                onChange={(html) => field.onChange(html)}
                onBlur={field.onBlur}
              />
            </DeferredMount>
          )}
        />
      </FormSection>
    </div>
  );
}
