import React, { useState, useCallback, useDeferredValue, useEffect } from "react";
import { useFormContext, useFormState, useController, Controller, FieldValues, Path } from "react-hook-form";
import { Input, InputProps } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RichTextEditor } from "@/components/shared/RichTextEditor";
import { IconSelector } from "./IconSelector";
import { Checkbox } from "@/components/ui/checkbox";
import { HEX_COLOR_REGEX } from "@/types/schemas";

const fieldId = (name: string) => name;
const labelId = (name: string) => `${name}-label`;
const descriptionId = (name: string) => `${name}-description`;
const errorId = (name: string) => `${name}-error`;
const describedBy = (name: string, description?: string, hasError?: boolean) =>
  [description ? descriptionId(name) : undefined, hasError ? errorId(name) : undefined]
    .filter(Boolean)
    .join(" ") || undefined;


interface FormInputProps<T extends FieldValues>
  extends Omit<InputProps, "name" | "onChange" | "onBlur" | "value" | "ref"> {
  name: Path<T>;
  label: string;
  description?: string;
}

// Uncontrolled: uses `register()` so RHF stores the raw string and the Zod
// schema's nullableNumber transform handles "" → null. Subscribes to errors
// via the field-scoped `useFormState`, so unrelated form-state churn does
// not re-render this input.
export function FormInput<T extends FieldValues>({
  name,
  label,
  description,
  ...props
}: FormInputProps<T>) {
  const { register, control, getFieldState } = useFormContext<T>();
  const formState = useFormState({ control, name });
  const { error } = getFieldState(name, formState);
  const hasError = Boolean(error);

  return (
    <div className="space-y-2">
      <Label id={labelId(name)} htmlFor={fieldId(name)}>{label}</Label>
      <Input
        {...register(name)}
        {...props}
        id={fieldId(name)}
        aria-invalid={hasError || undefined}
        aria-describedby={describedBy(name, description, hasError)}
      />
      {description && (
        <p id={descriptionId(name)} className="text-sm text-muted-foreground">{description}</p>
      )}
      {error && (
        <p id={errorId(name)} className="text-sm font-medium text-destructive">
          {error.message}
        </p>
      )}
    </div>
  );
}


interface FormSelectProps<T extends FieldValues> {
  name: Path<T>;
  label: string;
  placeholder: string;
  options: readonly { value: string; label: string }[];
  description?: string;
}

// Uses `useController` for narrow per-field RHF subscription: no Controller
// render-prop wrapping so unrelated form-state churn won't re-render this select.
// The SelectItem list is gated on `itemsReady` (initially false, then true on
// React's transition-priority deferred render) so the hidden option tree is
// not built during the initial form-mount commit. Children passed to
// SelectValue derive the label from `options` directly so the trigger still
// shows the correct label on first paint without depending on item mounting.
export function FormSelect<T extends FieldValues>({
  name,
  label,
  placeholder,
  options,
  description,
}: FormSelectProps<T>) {
  const { control } = useFormContext<T>();
  const {
    field,
    fieldState: { error },
  } = useController({ name, control });
  const itemsReady = useDeferredValue(true, false);
  const helpId = description ? descriptionId(name) : undefined;
  const messageId = errorId(name);
  const hasError = Boolean(error);
  const fieldValue: unknown = field.value;
  const stringValue: string =
    typeof fieldValue === "string" || typeof fieldValue === "number"
      ? String(fieldValue)
      : "";
  const selectedLabel = options.find((opt) => opt.value === stringValue)?.label;

  return (
    <div className="space-y-2">
      <Label id={labelId(name)} htmlFor={fieldId(name)}>{label}</Label>
      <Select
        name={field.name}
        value={stringValue}
        onValueChange={field.onChange}
        onOpenChange={(isOpen) => {
          if (!isOpen) field.onBlur();
        }}
      >
        <SelectTrigger
          id={fieldId(name)}
          ref={field.ref}
          aria-labelledby={labelId(name)}
          aria-invalid={hasError || undefined}
          aria-describedby={[helpId, hasError ? messageId : undefined]
            .filter(Boolean)
            .join(" ") || undefined}
        >
          <SelectValue placeholder={placeholder}>
            {selectedLabel}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {itemsReady && options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {description && (
        <p id={helpId} className="text-sm text-muted-foreground">{description}</p>
      )}
      {error && (
        <p id={messageId} className="text-sm font-medium text-destructive">
          {error.message}
        </p>
      )}
    </div>
  );
}


interface FormRichTextProps<T extends FieldValues> {
  name: Path<T>;
  label: string;
  description?: string;
}

export function FormRichText<T extends FieldValues>({
  name,
  label,
  description,
}: FormRichTextProps<T>) {
  const { control } = useFormContext<T>();
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => {
        const hasError = Boolean(error);
        return (
        <div className="space-y-2">
          {label && <Label id={labelId(name)} htmlFor={fieldId(name)}>{label}</Label>}
          <RichTextEditor
            id={fieldId(name)}
            content={field.value}
            onChange={field.onChange}
            ariaLabelledBy={labelId(name)}
            ariaDescribedBy={describedBy(name, description, hasError)}
            ariaInvalid={hasError}
          />
          {description && (
            <p id={descriptionId(name)} className="text-sm text-muted-foreground">{description}</p>
          )}
          {error && (
            <p id={errorId(name)} className="text-sm font-medium text-destructive">
              {error.message}
            </p>
          )}
        </div>
      )}}
    />
  );
}


interface FormIconSelectorProps<T extends FieldValues> {
  name: Path<T>;
  label: string;
  description?: string;
}

export function FormIconSelector<T extends FieldValues>({
  name,
  label,
  description,
}: FormIconSelectorProps<T>) {
  const { control } = useFormContext<T>();
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <div className="space-y-2">
          <IconSelector
            value={field.value ?? ""}
            onValueChange={field.onChange}
            label={label}
            id={fieldId(name)}
            ariaDescribedBy={describedBy(name, description, Boolean(error))}
            ariaInvalid={Boolean(error)}
          />
          {description && (
            <p id={descriptionId(name)} className="text-sm text-muted-foreground">{description}</p>
          )}
          {error && (
            <p id={errorId(name)} className="text-sm font-medium text-destructive">
              {error.message}
            </p>
          )}
        </div>
      )}
    />
  );
}


interface FormCheckboxProps<T extends FieldValues> {
  name: Path<T>;
  label: string;
  description?: string;
}

export function FormCheckbox<T extends FieldValues>({
  name,
  label,
  description,
}: FormCheckboxProps<T>) {
  const { control } = useFormContext<T>();
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <div className="space-y-2">
          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id={name}
              checked={field.value ?? false}
              onCheckedChange={field.onChange}
              onBlur={field.onBlur}
              ref={field.ref}
              aria-invalid={Boolean(error) || undefined}
              aria-describedby={describedBy(name, description, Boolean(error))}
              aria-labelledby={`${name}-label`}
            />
            <label
              id={`${name}-label`}
              htmlFor={name}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {label}
            </label>
          </div>
          {description && (
            <p id={descriptionId(name)} className="text-sm text-muted-foreground">{description}</p>
          )}
          {error && (
            <p id={errorId(name)} className="text-sm font-medium text-destructive">
              {error.message}
            </p>
          )}
        </div>
      )}
    />
  );
}


const DEFAULT_COLOR = "#22c55e";

interface FormColorPickerProps<T extends FieldValues> {
  name: Path<T>;
  label: string;
  description?: string;
  defaultColor?: string;
}

/**
 * Defers syncing to react-hook-form until blur/mouse-up/valid hex to avoid drag jank.
 */
export function FormColorPicker<T extends FieldValues>({
  name,
  label,
  description,
  defaultColor = DEFAULT_COLOR,
}: FormColorPickerProps<T>) {
  const { control } = useFormContext<T>();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <ColorPickerInner
          value={field.value}
          onChange={field.onChange}
          defaultColor={defaultColor}
          label={label}
          name={name}
          description={description}
          error={error?.message}
        />
      )}
    />
  );
}

interface ColorPickerInnerProps {
  value: string | null | undefined;
  onChange: (value: string) => void;
  defaultColor: string;
  label: string;
  name: string;
  description?: string;
  error?: string;
}

function ColorPickerInner({
  value,
  onChange,
  defaultColor,
  label,
  name,
  description,
  error,
}: ColorPickerInnerProps) {
  const [localColor, setLocalColor] = useState(value ?? defaultColor);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!isDragging) {
      setLocalColor(value ?? defaultColor);
    }
  }, [value, defaultColor, isDragging]);

  const commitColor = useCallback((color: string) => {
    if (HEX_COLOR_REGEX.test(color)) {
      onChange(color);
    }
  }, [onChange]);

  const handlePickerChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalColor(e.target.value);
  }, []);

  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    commitColor(localColor);
  }, [localColor, commitColor]);

  const handlePickerBlur = useCallback(() => {
    setIsDragging(false);
    commitColor(localColor);
  }, [localColor, commitColor]);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalColor(newValue);
    if (HEX_COLOR_REGEX.test(newValue)) {
      onChange(newValue);
    }
  }, [onChange]);

  const handleTextBlur = useCallback(() => {
    if (HEX_COLOR_REGEX.test(localColor)) {
      commitColor(localColor);
    } else {
      setLocalColor(value ?? defaultColor);
    }
  }, [localColor, value, defaultColor, commitColor]);

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          id={`${name}-picker`}
          type="color"
          value={localColor}
          onChange={handlePickerChange}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onBlur={handlePickerBlur}
          className="w-16 h-10 p-1 cursor-pointer rounded border border-input bg-background"
          aria-label={`${label} color picker`}
        />
        <Input
          id={name}
          name={name}
          value={localColor}
          onChange={handleTextChange}
          onBlur={handleTextBlur}
          placeholder={defaultColor}
          className="flex-1 font-mono"
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy(name, description, Boolean(error))}
          maxLength={7}
        />
      </div>
      {description && (
        <p id={descriptionId(name)} className="text-sm text-muted-foreground">{description}</p>
      )}
      {error && (
        <p id={errorId(name)} className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
