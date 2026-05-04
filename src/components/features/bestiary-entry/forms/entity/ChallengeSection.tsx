import React from "react";
import { useFormContext } from "react-hook-form";
import { FormSection } from "@/components/forms/FormSection";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CR_OPTIONS, CR_TO_XP } from "@/lib/dnd/constants";
import { formatChallengeRating } from "@/lib/dnd";
import type { Entity } from "@/types";

export const ChallengeSection: React.FC = () => {
  const { register, watch, setValue } = useFormContext<Entity>();
  const challengeRating = watch("challengeRating");

  React.useEffect(() => {
    if (challengeRating !== null && challengeRating !== undefined) {
      const xp = CR_TO_XP[challengeRating] || 0;
      setValue("experiencePoints", xp);
    }
  }, [challengeRating, setValue]);

  return (
    <FormSection title="Challenge & Experience" iconCategory="dice" iconName="d20">
      <div className="space-y-2">
        <Label htmlFor="challengeRating">Challenge Rating</Label>
        <Select
          value={challengeRating?.toString() || ""}
          onValueChange={(value) => setValue("challengeRating", value ? parseFloat(value) : null, { shouldDirty: true })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select CR..." />
          </SelectTrigger>
          <SelectContent>
            {CR_OPTIONS.map((cr) => (
              <SelectItem key={cr} value={cr.toString()}>
                CR {formatChallengeRating(cr)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="experiencePoints">Experience Points</Label>
        <Input
          id="experiencePoints"
          type="number"
          {...register("experiencePoints", { valueAsNumber: true })}
          placeholder="Auto-calculated from CR"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="proficiencyBonus">Proficiency Bonus</Label>
        <Input
          id="proficiencyBonus"
          type="number"
          {...register("proficiencyBonus", { valueAsNumber: true })}
          placeholder="e.g., +2, +3, +4..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="legendaryActionsPerRound">Legendary Actions / Round</Label>
        <Input
          id="legendaryActionsPerRound"
          type="number"
          {...register("legendaryActionsPerRound", { valueAsNumber: true })}
          placeholder="Usually 3"
        />
      </div>
    </FormSection>
  );
};
