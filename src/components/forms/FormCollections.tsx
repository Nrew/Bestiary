import React from "react";
import { useFormContext, useWatch, Controller, FieldValues, Path } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Trash2 } from "lucide-react";
import { useEntitiesMap } from "@/store/appStore";
import { entityApi } from "@/lib/api";
import { getContextConfig } from "@/lib/context-config";
import { TIMING } from "@/lib/dnd/constants";
import { formatValue } from "@/lib/dnd/format-utils";
import { useReferencedEntryName } from "@/hooks/useReferencedEntryName";
import type { BestiaryEntry, ViewContext } from "@/types";
import { StatValue } from "@/types/generated";

function isStringNumberRecord(value: unknown): value is Record<string, string | number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.values(value).every(
    (entry): entry is string | number => typeof entry === "string" || typeof entry === "number"
  );
}


interface FormKeyValueProps<T extends FieldValues> {
  name: Path<T>;
  label: string;
  description?: string;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}

export function FormKeyValueEditor<T extends FieldValues>({
  name,
  label,
  description,
  keyPlaceholder = "Property name",
  valuePlaceholder = "Value",
}: FormKeyValueProps<T>) {
  const { control } = useFormContext<T>();
  const [newKey, setNewKey] = React.useState("");
  const [newValue, setNewValue] = React.useState("");

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => {
        const properties: Record<string, unknown> = field.value || {};
        const entries = Object.entries(properties);

        const addProperty = () => {
          if (!newKey.trim()) return;
          let parsedValue: unknown = newValue;
          if (newValue === "true") parsedValue = true;
          else if (newValue === "false") parsedValue = false;
          else if (!isNaN(Number(newValue)) && newValue.trim() !== "") parsedValue = Number(newValue);

          field.onChange({ ...properties, [newKey.trim()]: parsedValue });
          setNewKey("");
          setNewValue("");
        };

        const removeProperty = (key: string) => {
          const { [key]: _, ...rest } = properties;
          field.onChange(rest);
        };

        return (
          <div className="space-y-3">
            <Label>{label}</Label>
            <div className="space-y-2">
              {entries.map(([key, value]) => (
                <div key={key} className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                  <span className="font-medium text-sm min-w-30">{key}</span>
                  <span className="text-sm text-muted-foreground flex-1">{formatValue(value)}</span>
                  <button
                    type="button"
                    onClick={() => removeProperty(key)}
                    className="p-1 hover:bg-destructive/20 rounded"
                    aria-label={`Remove ${key} property`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder={keyPlaceholder}
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder={valuePlaceholder}
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addProperty())}
                className="flex-1"
              />
              <button
                type="button"
                onClick={addProperty}
                className="px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Add
              </button>
            </div>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
            {error && <p className="text-sm font-medium text-destructive">{error.message}</p>}
          </div>
        );
      }}
    />
  );
}


interface FormStatModifiersProps<T extends FieldValues> {
  name: Path<T>;
  label: string;
  description?: string;
}

export function FormStatModifiersEditor<T extends FieldValues>({
  name,
  label,
  description,
}: FormStatModifiersProps<T>) {
  const { control } = useFormContext<T>();
  const [newStat, setNewStat] = React.useState("");

  const commonStats = [
    "strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma",
    "ac", "hp", "speed", "attackBonus", "saveDC", "initiative"
  ];

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => {
        const modifiers: Record<string, StatValue> = field.value || {};
        const entries = Object.entries(modifiers);

        const addModifier = (stat: string) => {
          if (!stat.trim() || modifiers[stat]) return;
          field.onChange({ ...modifiers, [stat]: { type: "flat", value: 0 } });
          setNewStat("");
        };

        const removeModifier = (stat: string) => {
          const { [stat]: _, ...rest } = modifiers;
          field.onChange(rest);
        };

        const updateModifier = (stat: string, update: Partial<StatValue>) => {
          field.onChange({
            ...modifiers,
            [stat]: { ...modifiers[stat], ...update },
          });
        };

        return (
          <div className="space-y-3">
            <Label>{label}</Label>
            <div className="space-y-2">
              {entries.map(([stat, mod]) => (
                <div key={stat} className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                  <span className="font-medium text-sm min-w-25 capitalize">{stat}</span>
                  <Select
                    value={mod.type}
                    onValueChange={(type: StatValue["type"]) => updateModifier(stat, { type })}
                  >
                    <SelectTrigger className="w-25" aria-label={`${stat} modifier type`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flat">Flat</SelectItem>
                      <SelectItem value="percentAdd">+%</SelectItem>
                      <SelectItem value="percentMult">×%</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    step="0.01"
                    value={mod.value}
                    onChange={(e) => updateModifier(stat, { value: parseFloat(e.target.value) || 0 })}
                    className="w-[80px]"
                    aria-label={`${stat} modifier value`}
                  />
                  <button
                    type="button"
                    onClick={() => removeModifier(stat)}
                    className="p-1 hover:bg-destructive/20 rounded"
                    aria-label={`Remove ${stat} modifier`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap">
              {commonStats
                .filter((s) => !modifiers[s])
                .slice(0, 6)
                .map((stat) => (
                  <button
                    key={stat}
                    type="button"
                    onClick={() => addModifier(stat)}
                    className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 capitalize"
                  >
                    + {stat}
                  </button>
                ))}
              <div className="flex gap-1">
                <Input
                  placeholder="Custom stat..."
                  value={newStat}
                  onChange={(e) => setNewStat(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addModifier(newStat))}
                  className="w-30 h-7 text-xs"
                />
              </div>
            </div>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
            {error && <p className="text-sm font-medium text-destructive">{error.message}</p>}
          </div>
        );
      }}
    />
  );
}


interface FormEntryPickerProps<T extends FieldValues> {
  name: Path<T>;
  label: string;
  description?: string;
  context: ViewContext;
}

const SelectedEntryBadge = React.memo<{
  id: string;
  context: ViewContext;
  onRemove: () => void;
}>(({ id, context, onRemove }) => {
  const { status, name } = useReferencedEntryName(context, id);
  const isMissing = status === "missing";
  const displayName = isMissing
    ? `Deleted (${name || id.slice(0, 8)})`
    : name;

  return (
    <Badge
      variant={isMissing ? "destructive" : "secondary"}
      className={`gap-1 pr-1 ${isMissing ? "line-through opacity-60" : ""}`}
      title={isMissing ? "This entry no longer exists" : undefined}
    >
      {displayName}
      {isMissing && <span aria-hidden="true"> ⚠</span>}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20 no-underline"
        aria-label={`Remove ${displayName}`}
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
});

SelectedEntryBadge.displayName = "SelectedEntryBadge";

/** Multi-select picker for entries (statuses, abilities, items, entities) */
export function FormEntryPicker<T extends FieldValues>({
  name,
  label,
  description,
  context,
}: FormEntryPickerProps<T>) {
  const { control } = useFormContext<T>();
  const [search, setSearch] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [remoteEntries, setRemoteEntries] = React.useState<BestiaryEntry[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const selectedIdsWatch = useWatch({ control, name }) as string[] | undefined;
  const selectedIdsForQuery = React.useMemo(
    () => (Array.isArray(selectedIdsWatch) ? selectedIdsWatch : []),
    [selectedIdsWatch]
  );

  React.useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const timeoutId = setTimeout(() => {
      const config = getContextConfig(context);
      setIsSearching(true);
      config.api.search(search, 50, 0)
        .then((entries) => {
          if (!cancelled) {
            setRemoteEntries(entries.filter((entry) => !selectedIdsForQuery.includes(entry.id)));
          }
        })
        .catch(() => {
          if (!cancelled) setRemoteEntries([]);
        })
        .finally(() => {
          if (!cancelled) setIsSearching(false);
        });
    }, search.trim() ? TIMING.SEARCH_DEBOUNCE : 0);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [context, open, search, selectedIdsForQuery]);

  React.useEffect(() => {
    setActiveIndex(0);
  }, [remoteEntries.length, search]);

  // Close dropdown on outside click
  React.useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => {
        const selectedIds: string[] = field.value || [];

        const availableEntries = remoteEntries.filter((e) => !selectedIds.includes(e.id));

        const handleSelect = (id: string) => {
          if (!selectedIds.includes(id)) {
            field.onChange([...selectedIds, id]);
          }
          setSearch("");
          inputRef.current?.focus();
        };

        const handleRemove = (id: string) => {
          field.onChange(selectedIds.filter((x) => x !== id));
        };

        return (
          <div className="space-y-2">
            <Label>{label}</Label>

            {selectedIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedIds.map((id) => (
                  <SelectedEntryBadge
                    key={id}
                    id={id}
                    context={context}
                    onRemove={() => handleRemove(id)}
                  />
                ))}
              </div>
            )}

            <div ref={containerRef} className="relative w-64">
              <Input
                ref={inputRef}
                placeholder={`Add ${context.slice(0, -1)}...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setOpen(false);
                    setSearch("");
                    return;
                  }
                  if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
                    setOpen(true);
                  }
                  if (e.key === "ArrowDown" && availableEntries.length > 0) {
                    e.preventDefault();
                    setActiveIndex((index) => Math.min(index + 1, availableEntries.length - 1));
                  }
                  if (e.key === "ArrowUp" && availableEntries.length > 0) {
                    e.preventDefault();
                    setActiveIndex((index) => Math.max(index - 1, 0));
                  }
                  if (e.key === "Enter" && open && availableEntries[activeIndex]) {
                    e.preventDefault();
                    handleSelect(availableEntries[activeIndex].id);
                  }
                }}
                className="h-9"
                role="combobox"
                aria-expanded={open}
                aria-controls={`${name}-listbox`}
                aria-activedescendant={
                  open && availableEntries[activeIndex]
                    ? `${name}-option-${availableEntries[activeIndex].id}`
                    : undefined
                }
                aria-haspopup="listbox"
                aria-autocomplete="list"
                aria-label={`Search for ${context}`}
              />

              {open && (
                <div
                  id={`${name}-listbox`}
                  role="listbox"
                  aria-label={`Available ${context}`}
                  className="absolute z-50 mt-1 w-full max-h-48 overflow-auto rounded-md border bg-popover shadow-md"
                >
                  {isSearching ? (
                    <p className="py-4 text-center text-sm text-muted-foreground" role="status">
                      Searching...
                    </p>
                  ) : availableEntries.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground" role="status">
                      {search ? "No matches" : "No options available"}
                    </p>
                  ) : (
                    availableEntries.slice(0, 20).map((entry, index) => (
                      <div
                        id={`${name}-option-${entry.id}`}
                        key={entry.id}
                        role="option"
                        tabIndex={-1}
                        aria-selected={index === activeIndex}
                        onMouseDown={(e) => e.preventDefault()}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => handleSelect(entry.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleSelect(entry.id);
                          }
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-accent cursor-pointer ${
                          index === activeIndex ? "bg-accent" : ""
                        }`}
                      >
                        {entry.name}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {description && <p className="text-xs text-muted-foreground">{description}</p>}
            {error && <p className="text-sm text-destructive">{error.message}</p>}
          </div>
        );
      }}
    />
  );
}


const UUID_REGEX_PICKER = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Searchable picker that resolves a UUID to an entity name and lets the user change it. */
export const EntityStatPicker: React.FC<{
  value: string;
  onChange: (id: string) => void;
}> = ({ value, onChange }) => {
  const entitiesMap = useEntitiesMap();
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [fetchedName, setFetchedName] = React.useState<string | null>(null);

  const storedName = value ? (entitiesMap.get(value)?.name ?? null) : null;

  React.useEffect(() => {
    if (!value || !UUID_REGEX_PICKER.test(value) || storedName || fetchedName !== null) return;
    let cancelled = false;
    void entityApi.getDetails(value)
      .then((e) => { if (!cancelled) setFetchedName(e.name); })
      .catch(() => { if (!cancelled) setFetchedName(""); });
    return () => { cancelled = true; };
  }, [value, storedName, fetchedName]);

  const displayName = storedName ?? fetchedName ?? (value ? value.slice(0, 8) + "…" : null);

  const allEntities = React.useMemo(
    () => [...entitiesMap.values()].sort((a, b) => a.name.localeCompare(b.name)),
    [entitiesMap]
  );
  const filtered = React.useMemo(() => {
    const q = search.toLowerCase();
    return (q ? allEntities.filter((e) => e.name.toLowerCase().includes(q)) : allEntities).slice(0, 20);
  }, [allEntities, search]);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false); setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      {displayName ? (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1 max-w-40 truncate">
            {displayName}
            <button
              type="button"
              onClick={() => { onChange(""); setFetchedName(null); }}
              className="p-0.5 hover:bg-destructive/20 rounded shrink-0"
              aria-label="Clear"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
          >
            Change
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
        >
          <Plus className="h-3 w-3" /> Select entity
        </button>
      )}
      {open && (
        <div className="absolute z-50 mt-1 w-64 rounded-md border bg-popover shadow-md">
          <div className="p-2 border-b">
            <Input
              placeholder="Search entities…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-auto p-1">
            {filtered.length === 0 ? (
              <p className="py-3 text-center text-sm text-muted-foreground">
                {entitiesMap.size === 0 ? "Browse entities first to load them" : "No matches"}
              </p>
            ) : filtered.map((entity) => (
              <button
                key={entity.id}
                type="button"
                className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent"
                onClick={() => { onChange(entity.id); setFetchedName(null); setOpen(false); setSearch(""); }}
              >
                {entity.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};


interface CustomPropertiesFieldsProps {
  /** Dot-path into the form state, e.g. "statBlock.custom" or "payload.custom" */
  fieldPath: string;
  /** Known key to display label pairs shown in the "add" dropdown */
  suggestions?: Record<string, string>;
  /** Keys whose values are entity UUIDs; render EntityStatPicker instead of Input. */
  entityStatKeys?: Set<string>;
}

/** Renders a text input or EntityStatPicker per field depending on key type and value shape. */
export const CustomPropertiesFields: React.FC<CustomPropertiesFieldsProps> = ({
  fieldPath,
  suggestions = {},
  entityStatKeys = new Set(),
}) => {
  const { setValue, control } = useFormContext<FieldValues>();
  // Scoped useWatch prevents re-renders from unrelated field changes (save button flicker).
  const watchedCustomObj: unknown = useWatch({ control, name: fieldPath });
  const customObj: Record<string, string | number> = isStringNumberRecord(watchedCustomObj)
    ? watchedCustomObj
    : {};
  const entries = Object.entries(customObj);

  const [newKey, setNewKey] = React.useState("");
  const [newValue, setNewValue] = React.useState("");
  const [newEntityId, setNewEntityId] = React.useState("");

  const isEntityKey = entityStatKeys.has(newKey);

  const set = (next: Record<string, string | number>) =>
    setValue(fieldPath, next, { shouldDirty: true });

  const handleAdd = () => {
    if (!newKey.trim()) return;
    if (isEntityKey) {
      if (!newEntityId) return;
      set({ ...customObj, [newKey]: newEntityId });
      setNewKey(""); setNewEntityId("");
    } else {
      const raw = newValue.trim();
      set({ ...customObj, [newKey]: /^\d+$/.test(raw) ? parseInt(raw, 10) : raw });
      setNewKey(""); setNewValue("");
    }
  };

  const handleRemove = (key: string) => {
    const next = { ...customObj };
    delete next[key];
    set(next);
  };

  const getLabel = (key: string) => suggestions[key] || key;

  return (
    <div className="space-y-4">
      {entries.length > 0 && (
        <div className="space-y-2">
          {entries.map(([key, value]) => {
            const strVal = String(value);
            const useEntityPicker = entityStatKeys.has(key) || UUID_REGEX_PICKER.test(strVal);
            return (
              <div key={key} className="flex gap-2 items-center">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground mb-1 block">{getLabel(key)}</Label>
                  {useEntityPicker ? (
                    <EntityStatPicker
                      value={strVal}
                      onChange={(id) => set({ ...customObj, [key]: id })}
                    />
                  ) : (
                    <Input
                      value={strVal}
                      onChange={(e) => {
                        const v = e.target.value;
                        set({ ...customObj, [key]: /^\d+$/.test(v) ? parseInt(v, 10) : v });
                      }}
                      placeholder="Value"
                    />
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemove(key)}
                  className="shrink-0 mt-5"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-2 items-end">
        <div className="flex-1 space-y-2">
          <Label id={`${fieldPath}-property-label`} className="text-xs">Property</Label>
          {Object.keys(suggestions).length > 0 ? (
            <Select value={newKey} onValueChange={(k) => { setNewKey(k); setNewValue(""); setNewEntityId(""); }}>
              <SelectTrigger aria-labelledby={`${fieldPath}-property-label`}><SelectValue placeholder="Select property…" /></SelectTrigger>
              <SelectContent>
                {Object.entries(suggestions)
                  .filter(([key]) => !(key in customObj))
                  .map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="Property name"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
            />
          )}
        </div>
        <div className="flex-1 space-y-2">
          <Label className="text-xs">Value</Label>
          {isEntityKey ? (
            <EntityStatPicker value={newEntityId} onChange={setNewEntityId} />
          ) : (
            <Input
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="Value"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
            />
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleAdd}
          disabled={isEntityKey ? !newEntityId : !newKey.trim()}
          className="shrink-0"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
