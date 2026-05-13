import React, { useDeferredValue, useEffect, useId, useMemo, useState } from "react";
import { useController, useFormContext, useWatch } from "react-hook-form";
import { ChevronDown } from "lucide-react";
import { FormSection } from "@/components/forms/FormSection";
import { FormInput, FormSelect } from "@/components/forms/FormPrimitives";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { listboxOptionVariants } from "@/components/ui/listbox-option";
import { useGameEnums } from "@/store/appStore";
import { ALIGNMENT_OPTIONS, ENTITY_SIZE_LABELS, THREAT_LEVEL_LABELS } from "@/lib/dnd/constants";
import type { Entity } from "@/types";

// Themed combobox: native <datalist> can't be styled and inherits OS chrome.
function AlignmentField() {
  const { control } = useFormContext<Entity>();
  const {
    field,
    fieldState: { error },
  } = useController({ name: "alignment", control });
  const value = typeof field.value === "string" ? field.value : "";

  const listboxId = useId();
  const descriptionId = `${listboxId}-description`;
  const errorId = `${listboxId}-error`;

  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  // Defer the option list creation past the initial form-mount commit.
  // The popover stays closed on first paint so users never see the empty
  // tree; the deferred render fills it in at transition priority before
  // any plausible interaction.
  const itemsReady = useDeferredValue(true, false);

  const options = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!query) return ALIGNMENT_OPTIONS;
    return ALIGNMENT_OPTIONS.filter((opt) =>
      opt.toLowerCase().includes(query),
    );
  }, [value]);

  useEffect(() => {
    setHighlight(0);
  }, [options.length]);

  const commit = (option: string) => {
    field.onChange(option);
    setOpen(false);
  };

  const popoverOpen = open && options.length > 0;
  const activeId = popoverOpen ? `${listboxId}-${highlight}` : undefined;
  const hasError = Boolean(error);
  const describedBy =
    [hasError ? errorId : null, descriptionId].filter(Boolean).join(" ") ||
    undefined;

  return (
    <div className="space-y-2">
      <Label htmlFor={listboxId}>Alignment</Label>
      <Popover open={popoverOpen} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <div className="relative">
            <Input
              ref={field.ref}
              id={listboxId}
              name={field.name}
              value={value}
              onChange={(event) => {
                field.onChange(event.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onBlur={field.onBlur}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  if (!open) {
                    setOpen(true);
                    return;
                  }
                  setHighlight((h) => Math.min(h + 1, options.length - 1));
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setHighlight((h) => Math.max(h - 1, 0));
                } else if (
                  event.key === "Enter" &&
                  popoverOpen
                ) {
                  event.preventDefault();
                  commit(options[highlight] ?? options[0]);
                } else if (event.key === "Escape" && open) {
                  event.preventDefault();
                  setOpen(false);
                }
              }}
              placeholder="e.g., Lawful Good, Unaligned"
              autoComplete="off"
              className="pr-9"
              role="combobox"
              aria-expanded={popoverOpen}
              aria-controls={popoverOpen ? listboxId + "-listbox" : undefined}
              aria-autocomplete="list"
              aria-activedescendant={activeId}
              aria-invalid={hasError || undefined}
              aria-describedby={describedBy}
            />
            <ChevronDown
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
          </div>
        </PopoverAnchor>
        <PopoverContent
          align="start"
          sideOffset={4}
          onOpenAutoFocus={(event) => event.preventDefault()}
          onInteractOutside={(event) => {
            // PopoverAnchor isn't part of Radix's "inside content" check, so
            // a pointerdown on the anchor input would otherwise fire
            // onOpenChange(false) immediately after onFocus opened it.
            if (event.target instanceof HTMLElement && event.target.id === listboxId) {
              event.preventDefault();
            }
          }}
          className="w-(--radix-popover-trigger-width) max-h-60 overflow-y-auto p-0"
        >
          <ul
            id={listboxId + "-listbox"}
            role="listbox"
            aria-label="Alignment suggestions"
            className="py-1"
          >
            {itemsReady && options.map((option, index) => (
              <li
                id={`${listboxId}-${index}`}
                key={option}
                role="option"
                aria-selected={index === highlight}
                onMouseEnter={() => setHighlight(index)}
                onMouseDown={(event) => {
                  event.preventDefault();
                  commit(option);
                }}
                className={cn(
                  listboxOptionVariants({ active: index === highlight, emphasis: "accent" }),
                  "px-3 py-1.5 font-serif",
                )}
              >
                {option}
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>
      <p id={descriptionId} className="text-sm text-muted-foreground">
        Standard 5e options are suggested; custom strings are accepted.
      </p>
      {hasError && (
        <p id={errorId} className="text-sm font-medium text-destructive">
          {error?.message}
        </p>
      )}
    </div>
  );
}

export function BasicInfoSection() {
  const gameEnums = useGameEnums();
  const { setValue, control, register } = useFormContext<Entity>();
  const slugManuallyEdited = React.useRef(false);
  const lastAutoSlugRef = React.useRef<string | null>(null);
  // Single subscription returning a tuple: RHF still re-renders this
  // component when any of the three change (same as three separate watches)
  // but the subscription bookkeeping is one entry, not three.
  const [name, slug, entryId] = useWatch({
    control,
    name: ["name", "slug", "id"],
  });

  const deriveSlug = React.useCallback((value: string) => value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80), []);

  // Reset auto-tracking on entry change only. Seeds `lastAutoSlugRef` so an
  // existing entry whose slug already matches `deriveSlug(name)` keeps auto-tracking,
  // while a manually-customized slug stays as-is.
  // Why `name`/`slug` are NOT deps: re-running this on every keystroke nulled
  // `lastAutoSlugRef` whenever name and slug were transiently out of sync, which
  // caused effect 2 below to bail and stop auto-deriving after the first character.
  React.useEffect(() => {
    slugManuallyEdited.current = false;
    lastAutoSlugRef.current = name && slug === deriveSlug(name) ? slug : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryId]);

  React.useEffect(() => {
    if (slugManuallyEdited.current) return;
    if (!name) return;
    if (slug && slug !== lastAutoSlugRef.current) return;
    const derived = deriveSlug(name);
    if (slug === derived) return;
    lastAutoSlugRef.current = derived;
    setValue("slug", derived, { shouldDirty: true });
  }, [deriveSlug, name, setValue, slug]);

  const sizeOptions = useMemo(
    () => gameEnums?.entitySizes.map(s => ({ value: s, label: ENTITY_SIZE_LABELS[s] })) || [],
    [gameEnums?.entitySizes]
  );

  const threatOptions = useMemo(
    () => gameEnums?.threatLevels.map(t => ({ value: t, label: THREAT_LEVEL_LABELS[t] })) || [],
    [gameEnums?.threatLevels]
  );

  return (
    <FormSection title="Basic Information" iconCategory="entity" iconName="monster">
      <FormInput<Entity> name="name" label="Name" autoFocus />

      <div className="space-y-1.5">
        <Label htmlFor="slug" className="text-sm text-muted-foreground">
          Slug
        </Label>
        <Input
          {...register("slug")}
          id="slug"
          placeholder="auto-generated from name"
          className="font-mono text-sm"
          onFocus={() => {
            slugManuallyEdited.current = true;
          }}
        />
        <p className="text-xs text-muted-foreground">
          Used for internal references. Only letters, numbers, and hyphens.
        </p>
      </div>

      <FormSelect<Entity> name="size" label="Size" placeholder="Select size..." options={sizeOptions} />
      <FormSelect<Entity> name="threatLevel" label="Threat Level" placeholder="Select threat..." options={threatOptions} />

      <AlignmentField />
    </FormSection>
  );
}
