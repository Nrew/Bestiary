import { useFormContext, useWatch, Controller } from "react-hook-form";
import type { MagicSchool } from "@/types";
import type { AbilityFormData } from "@/types/schemas";
import { useGameEnums } from "@/store/appStore";
import { MAGIC_SCHOOL_LABELS } from "@/lib/dnd/constants";
import { FormSection } from "@/components/forms/FormSection";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { RichTextEditor } from "@/components/shared/RichTextEditor";

export function SpellFieldsSection() {
  const { control, register, setValue } = useFormContext<AbilityFormData>();
  const school = useWatch({ control, name: "school" });
  const ritual = useWatch({ control, name: "ritual" });
  const gameEnums = useGameEnums();
  const schools: MagicSchool[] = gameEnums?.magicSchools ?? [];

  return (
    <FormSection title="Spell Details" iconCategory="game" iconName="spell">
      <div className="space-y-2">
        <Label htmlFor="spell-level">Level (0 = Cantrip)</Label>
        <Input
          id="spell-level"
          type="number"
          min={0}
          max={9}
          {...register("spellLevel", {
            setValueAs: (v) =>
              v === "" || v == null ? null : Number(v),
          })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="spell-school">School</Label>
        <Select
          value={school ?? "none"}
          onValueChange={(v) =>
            setValue("school", v === "none" ? null : (v as MagicSchool),
              { shouldDirty: true })
          }
        >
          <SelectTrigger id="spell-school">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">—</SelectItem>
            {schools.map((s) =>
              <SelectItem key={s} value={s}>{MAGIC_SCHOOL_LABELS[s]}</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="col-span-full flex items-center space-x-2">
        <Checkbox
          id="spell-ritual"
          checked={ritual ?? false}
          onCheckedChange={(checked) =>
            setValue("ritual", !!checked, { shouldDirty: true })
          }
        />
        <Label htmlFor="spell-ritual" className="cursor-pointer">
          Can be cast as a ritual
        </Label>
      </div>

      <div className="col-span-full space-y-2">
        <Label htmlFor="higher-levels">At Higher Levels (optional)</Label>
        <Controller
          control={control}
          name="higherLevels"
          render={({ field }) => (
            <RichTextEditor
              content={field.value ?? ""}
              onChange={field.onChange}
              placeholder="When you cast this spell using a spell slot of 4th level or higher…"
            />
          )}
        />
      </div>
    </FormSection>
  );
}
