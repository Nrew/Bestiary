import { useFormContext, Path, FieldValues, PathValue } from "react-hook-form";
import { useState, useCallback, useEffect, useRef, useId } from "react";
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

function toStringArray(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.filter((v): v is string => typeof v === "string") : [];
}

/**
 * Local state drives inputs (no per-keystroke RHF writes).
 * Commits to form state on blur, add, or remove.
 * Resyncs from form state only when external content changes (entry navigation, form reset).
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

  const formValues = watch(name);

  const [items, setItems] = useState<ArrayItem[]>(() =>
    toStringArray(formValues).map((value) => ({ id: generateUuid(), value }))
  );

  // Keep a ref so blur/add/remove callbacks always read the latest items
  // without stale closure issues.
  const itemsRef = useRef(items);
  useEffect(() => { itemsRef.current = items; }, [items]);

  // Resync local state when external form content changes (e.g. entry navigation,
  // form reset). Compare by value so our own blur commits don't trigger a re-sync.
  useEffect(() => {
    const external = toStringArray(formValues);
    const local = itemsRef.current.map((i) => i.value);
    const same =
      local.length === external.length && local.every((v, i) => v === external[i]);
    if (!same) {
      setItems(external.map((value, i) => ({
        id: itemsRef.current[i]?.id ?? generateUuid(),
        value,
      })));
    }
  }, [formValues]);

  // Only updates local state — no RHF write on every keystroke.
  const handleChange = useCallback((index: number, value: string) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], value };
      return next;
    });
  }, []);

  // Commits the accumulated local edits to RHF once the user leaves the field.
  const handleBlur = useCallback(() => {
    setValue(
      name,
      itemsRef.current.map((i) => i.value) as PathValue<T, Path<T>>,
      { shouldDirty: true }
    );
  }, [name, setValue]);

  const handleAdd = useCallback(() => {
    const newItem = { id: generateUuid(), value: "" };
    const next = [...itemsRef.current, newItem];
    setItems(next);
    setValue(name, next.map((i) => i.value) as PathValue<T, Path<T>>, { shouldDirty: true });
    requestAnimationFrame(() => {
      document.getElementById(newItem.id)?.focus();
    });
  }, [name, setValue]);

  const handleRemove = useCallback((index: number) => {
    const next = itemsRef.current.filter((_, i) => i !== index);
    setItems(next);
    setValue(name, next.map((i) => i.value) as PathValue<T, Path<T>>, { shouldDirty: true });
  }, [name, setValue]);

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
            onBlur={handleBlur}
            placeholder={placeholder}
            className="flex-1"
            aria-label={`${label} item ${index + 1}`}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => handleRemove(index)}
            className="shrink-0 text-muted-foreground hover:text-destructive"
            aria-label={`Remove ${label.toLowerCase()} item ${index + 1}`}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ))}

      {items.length === 0 && (
        <p className="text-sm text-muted-foreground italic">
          No items added yet. Click &quot;{addButtonLabel}&quot; to add one.
        </p>
      )}
    </div>
  );
}
