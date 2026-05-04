import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";
import { useStatusesMap, useEntitiesMap } from "@/store/appStore";
import { getContextConfig } from "@/lib/context-config";
import type { BestiaryEntry } from "@/types";

interface SingleEntryPickerProps {
  label: string;
  value: string;
  onChange: (id: string) => void;
  context: "statuses" | "entities";
}

export const SingleEntryPicker: React.FC<SingleEntryPickerProps> = React.memo(
  ({ label, value, onChange, context }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [search, setSearch] = React.useState("");
    const [remoteEntries, setRemoteEntries] = React.useState<BestiaryEntry[]>([]);
    const [isSearching, setIsSearching] = React.useState(false);
    const [fetchedName, setFetchedName] = React.useState<string | null>(null);
    const [activeIndex, setActiveIndex] = React.useState(0);
    const listRef = React.useRef<HTMLDivElement>(null);
    const listboxId = React.useId();

    const statusesMap = useStatusesMap();
    const entitiesMap = useEntitiesMap();
    const entriesMap = context === "statuses" ? statusesMap : entitiesMap;

    const selectedName = value
      ? entriesMap.get(value)?.name || fetchedName || value.slice(0, 8) + "..."
      : null;

    React.useEffect(() => {
      if (!value || entriesMap.has(value) || fetchedName !== null) return;
      let cancelled = false;
      getContextConfig(context).api.getDetails(value)
        .then((entry) => {
          if (!cancelled) setFetchedName(entry.name);
        })
        .catch(() => {
          if (!cancelled) setFetchedName("");
        });
      return () => {
        cancelled = true;
      };
    }, [context, entriesMap, fetchedName, value]);

    React.useEffect(() => {
      if (!isOpen) return;
      let cancelled = false;
      setIsSearching(true);
      getContextConfig(context).api.search(search, 20, 0)
        .then((entries) => {
          if (!cancelled) setRemoteEntries(entries);
        })
        .catch(() => {
          if (!cancelled) setRemoteEntries([]);
        })
        .finally(() => {
          if (!cancelled) setIsSearching(false);
        });
      return () => {
        cancelled = true;
      };
    }, [context, isOpen, search]);

    const filteredEntries = remoteEntries;

    React.useEffect(() => {
      setActiveIndex(0);
    }, [filteredEntries.length]);

    const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex(i => Math.min(i + 1, filteredEntries.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex(i => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (filteredEntries[activeIndex]) {
            onChange(filteredEntries[activeIndex].id);
            setIsOpen(false);
            setSearch("");
          }
          break;
        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          setSearch("");
          break;
      }
    }, [isOpen, activeIndex, filteredEntries, onChange]);

    React.useEffect(() => {
      if (!isOpen) return;
      const handleClickOutside = (e: MouseEvent) => {
        if (listRef.current && !listRef.current.contains(e.target as Node)) {
          setIsOpen(false);
          setSearch("");
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    return (
      <div className="space-y-2">
        <Label id={`${listboxId}-label`}>{label}</Label>
        <div className="relative" ref={listRef}>
          {selectedName ? (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                {selectedName}
                <button
                  type="button"
                  onClick={() => onChange("")}
                  className="p-0.5 hover:bg-destructive/20 rounded"
                  aria-label={`Remove ${selectedName}`}
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </Badge>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
              aria-expanded={isOpen}
              aria-haspopup="listbox"
              aria-labelledby={`${listboxId}-label`}
            >
              <Plus className="h-3 w-3" aria-hidden="true" />
              Select {context === "statuses" ? "status" : "entity"}
            </button>
          )}

          {isOpen && (
            <div
              className="absolute z-50 mt-1 w-64 max-h-60 overflow-auto rounded-md border bg-popover p-1 shadow-md"
              role="dialog"
              aria-label={`Search ${context}`}
            >
              <Input
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                className="mb-2"
                autoFocus
                aria-controls={listboxId}
                aria-autocomplete="list"
              />
              {isSearching ? (
                <p className="text-sm text-muted-foreground p-2" role="status">
                  Searching...
                </p>
              ) : filteredEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground p-2" role="status">
                  No entries found
                </p>
              ) : (
                <div
                  id={listboxId}
                  role="listbox"
                  aria-label={`${context} options`}
                >
                  {filteredEntries.map((entry, index) => (
                    <button
                      key={entry.id}
                      type="button"
                      role="option"
                      aria-selected={index === activeIndex}
                      onClick={() => {
                        onChange(entry.id);
                        setIsOpen(false);
                        setSearch("");
                      }}
                      className={`w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent ${
                        index === activeIndex ? "bg-accent" : ""
                      }`}
                    >
                      {entry.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
);

SingleEntryPicker.displayName = "SingleEntryPicker";
