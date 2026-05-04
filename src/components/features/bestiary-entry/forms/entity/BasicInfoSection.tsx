import React, { useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { FormSection } from "@/components/forms/FormSection";
import { FormInput, FormSelect } from "@/components/forms/FormPrimitives";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGameEnums } from "@/store/appStore";
import { ALIGNMENT_OPTIONS, ENTITY_SIZE_LABELS, THREAT_LEVEL_LABELS } from "@/lib/dnd/constants";
import type { Entity } from "@/types";

const ALIGNMENT_DATALIST_ID = "entity-alignment-suggestions";

export const BasicInfoSection: React.FC = () => {
  const gameEnums = useGameEnums();
  const { setValue, control, register } = useFormContext<Entity>();
  const slugManuallyEdited = React.useRef(false);
  const lastAutoSlugRef = React.useRef<string | null>(null);
  const name = useWatch({ control, name: "name" });
  const slug = useWatch({ control, name: "slug" });
  const entryId = useWatch({ control, name: "id" });

  const deriveSlug = React.useCallback((value: string) => value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80), []);

  // Reset the manual-edit flag whenever the entry changes so new entries auto-derive their slug.
  React.useEffect(() => {
    slugManuallyEdited.current = false;
    lastAutoSlugRef.current = name && slug === deriveSlug(name) ? slug : null;
  }, [entryId, deriveSlug, name, slug]);

  React.useEffect(() => {
    if (slugManuallyEdited.current) return;
    if (!name) return;
    if (slug && slug !== lastAutoSlugRef.current) return;
    const derived = deriveSlug(name);
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

      {/* Alignment: free-form text with the standard 5e values as suggestions
          so homebrew users can type "Chaotic Good (Trickster sect)" or any
          other custom alignment string. */}
      <FormInput<Entity>
        name="alignment"
        label="Alignment"
        placeholder="e.g., Lawful Good, Unaligned"
        list={ALIGNMENT_DATALIST_ID}
        autoComplete="off"
        description="Standard 5e options are suggested; custom strings are accepted."
      />
      <datalist id={ALIGNMENT_DATALIST_ID}>
        {ALIGNMENT_OPTIONS.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </FormSection>
  );
};
