import { useFormContext, Controller, FieldValues, Path } from "react-hook-form";
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
                  <SelectTrigger id={`${name}-type`} className="w-40" aria-label={`${label} type`}>
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
                  onChange={(e) =>
                    handleValueChange(parseFloat(e.target.value) || 0)
                  }
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
      render={({ field, fieldState: { error } }) => {
        const tags: string[] = field.value || [];

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
            <Label htmlFor={name}>{label}</Label>
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
                id={name}
                placeholder={tags.length === 0 ? placeholder || 'Add tags...' : ''}
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    addTag(e.currentTarget.value);
                    e.currentTarget.value = '';
                  } else if (e.key === 'Backspace' && e.currentTarget.value === '' && tags.length > 0) {
                    removeTag(tags[tags.length - 1]);
                  }
                }}
              />
            </div>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
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
