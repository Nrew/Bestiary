import React from "react";
import { useFormContext } from "react-hook-form";
import { FormSection } from "@/components/forms/FormSection";
import { FormInput, FormSelect, FormTagInput, FormKeyValueEditor, FormStatModifiersEditor } from "@/components/forms/FormPrimitives";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RichTextEditor } from "@/components/shared/RichTextEditor";
import { useGameEnums } from "@/store/appStore";
import { ITEM_TYPE_LABELS, RARITY_LABELS } from "@/lib/dnd/constants";
import type { Item } from "@/types";

export const ItemForm: React.FC = React.memo(() => {
  const {
    register,
    watch,
    setValue,
  } = useFormContext<Item>();
  const gameEnums = useGameEnums();

  const hasDurability = watch("durability") !== null;
  const durability = watch("durability");

  const itemTypeOptions = gameEnums?.itemTypes.map(t => ({ value: t, label: ITEM_TYPE_LABELS[t] })) || [];
  const rarityOptions = gameEnums?.rarities.map(r => ({ value: r, label: RARITY_LABELS[r] })) || [];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <FormSection title="Item Details" iconCategory="entity" iconName="weapon">
        <FormInput<Item> name="name" label="Name" placeholder="Vorpal Sword" autoFocus />

        <FormInput<Item> name="slug" label="Slug (unique ID)" placeholder="vorpal-sword" />

        <FormSelect<Item> name="type" label="Type" placeholder="Select type..." options={itemTypeOptions} />

        <FormSelect<Item> name="rarity" label="Rarity" placeholder="Select rarity..." options={rarityOptions} />

        <FormInput<Item> name="weight" label="Weight (lbs)" type="number" step="0.1" placeholder="e.g., 3.5" />

        <FormInput<Item> name="bulk" label="Bulk" type="number" step="0.1" placeholder="e.g., 1.0" />
      </FormSection>

      <FormSection title="Icon" iconCategory="entity" iconName="magic-item">
        <div className="col-span-full">
          <FormInput<Item> name="icon" label="Icon Path" placeholder="e.g., item/sword" />
        </div>
      </FormSection>

      <FormSection title="Durability" iconCategory="hp" iconName="full">
        <div className="col-span-full space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="has-durability"
              checked={hasDurability}
              onCheckedChange={(checked) => {
                if (checked) {
                  setValue("durability", { current: 100, max: 100 }, { shouldDirty: true });
                } else {
                  setValue("durability", null, { shouldDirty: true });
                }
              }}
            />
            <Label htmlFor="has-durability" className="cursor-pointer">
              This item has durability
            </Label>
          </div>

          {hasDurability && durability && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="durability.current">Current</Label>
                <Input
                  id="durability.current"
                  type="number"
                  {...register("durability.current", { valueAsNumber: true })}
                  min={0}
                  max={durability.max || 100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="durability.max">Maximum</Label>
                <Input
                  id="durability.max"
                  type="number"
                  {...register("durability.max", { valueAsNumber: true })}
                  min={1}
                />
              </div>
              {durability.current > durability.max && (
                <p className="col-span-2 text-xs text-destructive">
                  Current durability cannot exceed maximum durability
                </p>
              )}
            </div>
          )}
        </div>
      </FormSection>

      <FormSection title="Properties" iconCategory="attribute" iconName="test">
        <div className="col-span-full">
          <FormKeyValueEditor<Item>
            name="properties"
            label="Custom Properties"
            description="Add properties like magical, attunement, charges, etc. Boolean values: type 'true' or 'false'. Numbers are auto-detected."
            keyPlaceholder="Property name"
            valuePlaceholder="Value"
          />
        </div>
      </FormSection>

      <FormSection title="Equipment Slots" iconCategory="entity" iconName="armor">
        <div className="col-span-full">
          <FormTagInput<Item>
            name="equipSlots"
            label="Equipment Slots"
            description="Press Enter to add slots. Common: mainHand, offHand, head, neck, chest, back, hands, waist, feet, ring, trinket"
            placeholder="Type a slot and press Enter..."
          />
        </div>
      </FormSection>

      <FormSection title="Stat Modifiers" iconCategory="ability" iconName="strength">
        <div className="col-span-full">
          <FormStatModifiersEditor<Item>
            name="statModifiers"
            label="Stat Modifiers"
            description="Add stat modifiers with type (Flat, +%, ×%) and value"
          />
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
});

ItemForm.displayName = "ItemForm";