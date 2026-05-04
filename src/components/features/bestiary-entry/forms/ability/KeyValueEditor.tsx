import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { formatValue } from "@/lib/dnd/format-utils";

interface KeyValueEditorProps {
  label: string;
  value: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}

export const KeyValueEditor: React.FC<KeyValueEditorProps> = React.memo(
  ({ label, value, onChange }) => {
    const [newKey, setNewKey] = React.useState("");
    const [newValue, setNewValue] = React.useState("");
    const keyInputId = React.useId();
    const valueInputId = React.useId();

    const entries = Object.entries(value || {});

    const addProperty = () => {
      if (!newKey.trim()) return;
      let parsedValue: unknown = newValue;
      if (newValue === "true") parsedValue = true;
      else if (newValue === "false") parsedValue = false;
      else if (!isNaN(Number(newValue)) && newValue.trim() !== "") parsedValue = Number(newValue);

      onChange({ ...value, [newKey.trim()]: parsedValue });
      setNewKey("");
      setNewValue("");
    };

    const removeProperty = (key: string) => {
      const { [key]: _, ...rest } = value;
      onChange(rest);
    };

    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <div className="space-y-2" role="list" aria-label={`${label} entries`}>
          {entries.map(([key, val]) => (
            <div key={key} className="flex items-center gap-2 p-2 rounded-md bg-muted/50" role="listitem">
              <span className="font-medium text-sm min-w-20">{key}</span>
              <span className="text-sm text-muted-foreground flex-1">{formatValue(val)}</span>
              <button
                type="button"
                onClick={() => removeProperty(key)}
                className="p-1 hover:bg-destructive/20 rounded"
                aria-label={`Remove property ${key}`}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            id={keyInputId}
            placeholder="Key"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            className="flex-1"
            aria-label="Property key"
          />
          <Input
            id={valueInputId}
            placeholder="Value"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addProperty())}
            className="flex-1"
            aria-label="Property value"
          />
          <button
            type="button"
            onClick={addProperty}
            className="px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            aria-label="Add property"
          >
            Add
          </button>
        </div>
      </div>
    );
  }
);

KeyValueEditor.displayName = "KeyValueEditor";
