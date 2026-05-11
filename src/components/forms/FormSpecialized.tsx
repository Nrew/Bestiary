import { useState } from "react";
import {
  useFormContext,
  Controller,
  type ControllerRenderProps,
  type FieldValues,
  type Path,
} from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { X } from "lucide-react";
import { StatValue } from "@/types/generated";


interface FormStatValueInputProps<T extends FieldValues> {
  name: Path<T>;
  label: string;
  description?: string;
}

/** Null when unchecked; `{ type, value }` StatValue when checked. */
export function FormStatValueInput<T extends FieldValues>({
  name,
  label,
  description,
}: FormStatValueInputProps<T>) {
  const { control } = useFormContext<T>();
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => {
        const statValue: StatValue | null | undefined = field.value;
        const isEnabled = statValue !== null && statValue !== undefined;
        const currentType = statValue?.type || "flat";
        const currentValue = statValue?.value ?? 0;

        const handleToggle = (checked: boolean) => {
          if (checked) {
            field.onChange({ type: "flat", value: 0 });
          } else {
            field.onChange(null);
          }
        };

        const handleTypeChange = (newType: StatValue["type"]) => {
          field.onChange({ type: newType, value: currentValue });
        };

        const handleValueChange = (newValue: number) => {
          field.onChange({ type: currentType, value: newValue });
        };

        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id={`${name}-toggle`}
                checked={isEnabled}
                onCheckedChange={handleToggle}
              />
              <Label htmlFor={`${name}-toggle`} className="cursor-pointer">
                {label}
              </Label>
            </div>

            {isEnabled && (
              <div className="flex items-center gap-2 ml-6">
                <Select onValueChange={handleTypeChange} value={currentType}>
                  <label htmlFor={`${name}-type`} className="sr-only">{label} type</label>
                  <SelectTrigger id={`${name}-type`} className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flat">Flat Value</SelectItem>
                    <SelectItem value="percentAdd">Percent Add</SelectItem>
                    <SelectItem value="percentMult">Percent Multiply</SelectItem>
                  </SelectContent>
                </Select>
                <label htmlFor={`${name}-value`} className="sr-only">{label} amount</label>
                <Input
                  id={`${name}-value`}
                  type="number"
                  step="0.01"
                  value={currentValue}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    handleValueChange(Number.isFinite(v) ? v : 0);
                  }}
                  className="w-24"
                />
              </div>
            )}

            {description && (
              <p className="text-sm text-muted-foreground ml-6">{description}</p>
            )}
            {error && (
              <p className="text-sm font-medium text-destructive">
                {error.message}
              </p>
            )}
          </div>
        );
      }}
    />
  );
}


interface FormTagInputProps<T extends FieldValues> {
  name: Path<T>;
  label: string;
  description?: string;
  placeholder?: string;
}

interface FormTagInputInnerProps<T extends FieldValues> {
  field: ControllerRenderProps<T, Path<T>>;
  name: Path<T>;
  label: string;
  description?: string;
  placeholder?: string;
  error?: { message?: string };
}

function FormTagInputInner<T extends FieldValues>({
  field,
  name,
  label,
  description,
  placeholder,
  error,
}: FormTagInputInnerProps<T>) {
  const tags: string[] = field.value || [];
  const [inputValue, setInputValue] = useState("");

  const addTag = (newTagValue: string) => {
    const newTag = newTagValue.trim();
    if (newTag && !tags.includes(newTag)) {
      field.onChange([...tags, newTag]);
    }
  };

  const removeTag = (tagToRemove: string) => {
    field.onChange(tags.filter((tag) => tag !== tagToRemove));
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={String(name)}>{label}</Label>
      <div className="flex flex-wrap gap-2 rounded-md border border-input p-2 min-h-10">
        {tags.map((tag) => (
          <Badge key={tag} variant="secondary">
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="ml-1 rounded-full p-0.5 hover:bg-destructive/20"
              aria-label={`Remove ${tag}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <input
          ref={field.ref}
          id={String(name)}
          name={String(name)}
          placeholder={tags.length === 0 ? placeholder || "Add tags..." : ""}
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addTag(inputValue);
              setInputValue("");
            } else if (e.key === "Backspace" && inputValue === "" && tags.length > 0) {
              removeTag(tags[tags.length - 1]);
            }
          }}
        />
      </div>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      {error && <p className="text-sm font-medium text-destructive">{error.message}</p>}
    </div>
  );
}

export function FormTagInput<T extends FieldValues>({
  name,
  label,
  description,
  placeholder,
}: FormTagInputProps<T>) {
  const { control } = useFormContext<T>();
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <FormTagInputInner<T>
          field={field}
          name={name}
          label={label}
          description={description}
          placeholder={placeholder}
          error={error}
        />
      )}
    />
  );
}
