import React, { useEffect, useMemo } from "react";
import {
  useFormContext,
  useFieldArray,
  useWatch,
  type Control,
  type UseFormRegister,
  type UseFormSetValue,
  type UseFieldArrayRemove,
} from "react-hook-form";
import { FormSection } from "@/components/forms/FormSection";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useItemsMap, useAppStore } from "@/store/appStore";
import { cn } from "@/lib/utils";
import { Trash2, Plus } from "lucide-react";
import type { Entity } from "@/types";

type ItemOption = { value: string; label: string };
type ItemsMap = ReturnType<typeof useItemsMap>;

export function LootSection() {
  const { register, setValue, control, subscribe, getValues } = useFormContext<Entity>();
  const itemsMap = useItemsMap();
  const ensureItemsLoaded = useAppStore((s) => s.ensureItemsLoaded);

  // Side-channel listener (does NOT trigger a React render) so typing in any
  // inventory field doesn't re-render LootSection or its rows. `prevKey`
  // dedupes against itemId churn since quantity/dropChance edits don't need
  // to refetch.
  useEffect(() => {
    let prevKey = "";
    const sync = () => {
      const inv = getValues("inventory") ?? [];
      const ids = inv
        .map((entry) => entry?.itemId)
        .filter((id): id is string => Boolean(id));
      const key = ids.join(",");
      if (key === prevKey) return;
      prevKey = key;
      if (ids.length > 0) void ensureItemsLoaded(ids);
    };
    sync();
    return subscribe({
      name: "inventory",
      formState: { values: true },
      callback: sync,
    });
  }, [subscribe, getValues, ensureItemsLoaded]);

  const { fields: inventoryFields, append: appendInventory, remove: removeInventory } = useFieldArray({
    control,
    name: "inventory",
  });

  const itemOptions = useMemo<ItemOption[]>(
    () => Array.from(itemsMap.values()).map((item) => ({ value: item.id, label: item.name })),
    [itemsMap]
  );

  return (
    <FormSection title="Loot Table" iconCategory="item" iconName="loot">
      <div className="col-span-full space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Items that can be found on or dropped by this creature
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => appendInventory({ itemId: "", quantity: "1", dropChance: 1.0 })}
          >
            <Plus className="w-4 h-4 mr-1" /> Add Loot
          </Button>
        </div>

        {inventoryFields.length === 0 && (
          <p className="text-sm text-muted-foreground italic text-center py-4">
            No loot entries. Click "Add Loot" to add items this creature can drop.
          </p>
        )}

        {inventoryFields.map((field, index) => (
          <LootRow
            key={field.id}
            rowId={field.id}
            control={control}
            register={register}
            setValue={setValue}
            index={index}
            itemsMap={itemsMap}
            itemOptions={itemOptions}
            remove={removeInventory}
          />
        ))}
      </div>
    </FormSection>
  );
}

interface LootRowProps {
  rowId: string;
  control: Control<Entity>;
  register: UseFormRegister<Entity>;
  setValue: UseFormSetValue<Entity>;
  index: number;
  itemsMap: ItemsMap;
  itemOptions: ItemOption[];
  remove: UseFieldArrayRemove;
}

const LootRow = React.memo(function LootRow({
  rowId,
  control,
  register,
  setValue,
  index,
  itemsMap,
  itemOptions,
  remove,
}: LootRowProps) {
  const selectedItemId = useWatch({ control, name: `inventory.${index}.itemId` });
  const dropChance = useWatch({ control, name: `inventory.${index}.dropChance` });
  const selectedItem = selectedItemId ? itemsMap.get(selectedItemId) : null;
  const isBrokenRef = Boolean(selectedItemId) && !selectedItem;
  const brokenRefMessageId = `inventory-${rowId}-broken-reference`;

  return (
    <div className="flex gap-3 items-end p-3 rounded-lg bg-muted/30 border border-border/50">
      <div className="flex-[2_1_0%] space-y-2">
        <Label htmlFor={`inventory-${index}-item`}>Item</Label>
        <Select
          value={selectedItemId || ""}
          onValueChange={(value) => setValue(`inventory.${index}.itemId`, value, { shouldDirty: true })}
        >
          <SelectTrigger
            id={`inventory-${index}-item`}
            className={cn(isBrokenRef && "text-destructive border-destructive/40")}
            aria-invalid={isBrokenRef || undefined}
            aria-describedby={isBrokenRef ? brokenRefMessageId : undefined}
          >
            <SelectValue placeholder="Select item...">
              {selectedItem?.name ?? (selectedItemId ? "⚠ Item deleted" : "Select item...")}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {itemOptions.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isBrokenRef && (
          <p id={brokenRefMessageId} className="text-xs text-destructive">
            This loot item no longer exists. Choose another item or remove this row.
          </p>
        )}
      </div>

      <div className="flex-1 space-y-2">
        <Label htmlFor={`inventory-${index}-quantity`}>Quantity</Label>
        <Input
          id={`inventory-${index}-quantity`}
          {...register(`inventory.${index}.quantity`)}
          placeholder="e.g., 1, 1d4, 2d6"
        />
      </div>

      <div className="flex-1 space-y-2">
        <Label htmlFor={`inventory-${index}-drop-chance`}>Drop Chance</Label>
        <div className="flex items-center gap-1">
          <Input
            id={`inventory-${index}-drop-chance`}
            name={`inventory.${index}.dropChance`}
            type="number"
            min="0"
            max="100"
            step="5"
            value={Math.round((dropChance ?? 1) * 100)}
            onChange={(e) => {
              const pct = parseFloat(e.target.value);
              if (Number.isNaN(pct)) return;
              const clamped = Math.max(0, Math.min(100, pct));
              setValue(`inventory.${index}.dropChance`, clamped / 100, { shouldDirty: true });
            }}
            className="text-center"
          />
          <span className="text-sm text-muted-foreground">%</span>
        </div>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => remove(index)}
        className="shrink-0"
        aria-label="Remove loot entry"
      >
        <Trash2 className="w-4 h-4" aria-hidden="true" />
      </Button>
    </div>
  );
});
