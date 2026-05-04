import { useFormContext, Path, FieldValues, PathValue } from "react-hook-form";
import { useState, useCallback, useMemo, useEffect, useId } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";
import { generateUuid } from "@/lib/utils";

interface StringArrayFieldProps<T extends FieldValues> {
  name: Path<T>;
  label: string;
  placeholder?: string;
  description?: string;
  addButtonLabel?: string;
}

interface ArrayItem {
  id: string;
  value: string;
}

/**
 * Uses stable per-item keys to prevent DOM reuse issues on reorder/delete.
 * useFieldArray requires object arrays; this component uses watch/setValue
 * instead to handle primitive string arrays.
 */
export function StringArrayField<T extends FieldValues>({
  name,
  label,
  placeholder,
  description,
  addButtonLabel = "Add Item",
}: StringArrayFieldProps<T>) {
  const { watch, setValue } = useFormContext<T>();
  const groupLabelId = useId();

  const watchedValue: unknown = watch(name);
  const values = useMemo(
    () => (Array.isArray(watchedValue) ? watchedValue.filter((value): value is string => typeof value === "string") : []),
    [watchedValue]
  );

  // Stable per-item key so React doesn't remount inputs on reorder or delete
  const [itemIds, setItemIds] = useState<string[]>(() =>
    values.map(() => generateUuid())
  );

  useEffect(() => {
    if (itemIds.length !== values.length) {
      setItemIds((prev) => values.map((_, i) => prev[i] || generateUuid()));
    }
  // Depend on length only; including `values` would regenerate IDs on every keystroke
  }, [values.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const items: ArrayItem[] = useMemo(() => {
    return values.map((value, i) => ({ id: itemIds[i] ?? generateUuid(), value }));
  }, [values, itemIds]);

  const handleAdd = useCallback(() => {
    const newId = generateUuid();
    setItemIds(prev => [...prev, newId]);
    setValue(name, [...values, ""] as PathValue<T, Path<T>>, { shouldDirty: true });
  }, [name, values, setValue]);

  const handleRemove = useCallback((index: number) => {
    setItemIds(prev => prev.filter((_, i) => i !== index));
    const newValues = values.filter((_, i) => i !== index);
    setValue(name, newValues as PathValue<T, Path<T>>, { shouldDirty: true });
  }, [name, values, setValue]);

  const handleChange = useCallback((index: number, value: string) => {
    const newValues = [...values];
    newValues[index] = value;
    setValue(name, newValues as PathValue<T, Path<T>>, { shouldDirty: true });
  }, [name, values, setValue]);

  return (
    <div className="space-y-4" role="group" aria-labelledby={groupLabelId}>
      <div className="flex items-center justify-between">
        <Label id={groupLabelId}>{label}</Label>
        <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
          {addButtonLabel}
        </Button>
      </div>

      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}

      {items.map((item, index) => (
        <div key={item.id} className="flex gap-2 items-center">
          <Input
            id={item.id}
            value={item.value}
            onChange={(e) => handleChange(index, e.target.value)}
            placeholder={placeholder}
            className="flex-1"
            aria-label={`${label} item ${index + 1}`}
            aria-labelledby={groupLabelId}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => handleRemove(index)}
            className="shrink-0"
            aria-label={`Remove ${label.toLowerCase()} item ${index + 1}`}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ))}

      {items.length === 0 && (
        <p className="text-sm text-muted-foreground italic">
          No items added yet. Click "{addButtonLabel}" to add one.
        </p>
      )}
    </div>
  );
}
