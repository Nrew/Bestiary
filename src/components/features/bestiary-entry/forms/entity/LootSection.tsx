import React, { useEffect, useMemo } from "react";
import { useFormContext, useFieldArray, useWatch } from "react-hook-form";
import { FormSection } from "@/components/forms/FormSection";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useItemsMap, useAppStore } from "@/store/appStore";
import { cn } from "@/lib/utils";
import { Trash2, Plus } from "lucide-react";
import type { Entity } from "@/types";

export const LootSection: React.FC = () => {
  const { register, watch, setValue, control } = useFormContext<Entity>();
  const itemsMap = useItemsMap();
  const ensureItemsLoaded = useAppStore((s) => s.ensureItemsLoaded);

  // Ensure referenced items are loaded so we can resolve names in the Select trigger.
  // Without this, items already stored in `inventory` would appear as "Select item..."
  // indistinguishably from unselected rows on first render.
  const inventoryWatch = useWatch({ control, name: "inventory" });
  useEffect(() => {
    if (!Array.isArray(inventoryWatch) || inventoryWatch.length === 0) return;
    const ids = inventoryWatch
      .map((loot) => loot?.itemId)
      .filter((id): id is string => Boolean(id));
    if (ids.length > 0) void ensureItemsLoaded(ids);
  }, [inventoryWatch, ensureItemsLoaded]);

  const { fields: inventoryFields, append: appendInventory, remove: removeInventory } = useFieldArray({
    control,
    name: "inventory",
  });

  const itemOptions = useMemo(
    () => Array.from(itemsMap.values()).map(item => ({ value: item.id, label: item.name })),
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
            onClick={() => appendInventory({ itemId: itemOptions[0]?.value ?? "", quantity: "1", dropChance: 1.0 })}
          >
            <Plus className="w-4 h-4 mr-1" /> Add Loot
          </Button>
        </div>

        {inventoryFields.length === 0 && (
          <p className="text-sm text-muted-foreground italic text-center py-4">
            No loot entries. Click "Add Loot" to add items this creature can drop.
          </p>
        )}

        {inventoryFields.map((field, index) => {
          const selectedItemId = watch(`inventory.${index}.itemId`);
          const selectedItem = selectedItemId ? itemsMap.get(selectedItemId) : null;
          const isBrokenRef = Boolean(selectedItemId) && !selectedItem;
          const brokenRefMessageId = `inventory-${field.id}-broken-reference`;

          return (
            <div key={field.id} className="flex gap-3 items-end p-3 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex-2 space-y-2">
                <Label>Item</Label>
                <Select
                  value={selectedItemId || ""}
                  onValueChange={(value) => setValue(`inventory.${index}.itemId`, value, { shouldDirty: true })}
                >
                  <SelectTrigger
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
                <Label>Quantity</Label>
                <Input
                  {...register(`inventory.${index}.quantity`)}
                  placeholder="e.g., 1, 1d4, 2d6"
                />
              </div>

              <div className="flex-1 space-y-2">
                <Label>Drop Chance</Label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="5"
                    value={Math.round((watch(`inventory.${index}.dropChance`) ?? 1) * 100)}
                    onChange={(e) => {
                      const pct = parseFloat(e.target.value);
                      const clamped = isNaN(pct) ? 0 : Math.max(0, Math.min(100, pct));
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
                onClick={() => removeInventory(index)}
                className="shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          );
        })}
      </div>
    </FormSection>
  );
};
