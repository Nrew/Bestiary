import React from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { FormSection } from "@/components/forms/FormSection";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CR_OPTIONS } from "@/lib/dnd/constants";
import { formatChallengeRating, calculateProficiencyBonus, getMonsterXP } from "@/lib/dnd";
import type { Entity } from "@/types";

export const ChallengeSection: React.FC = () => {
  const { register, control, getValues, setValue } = useFormContext<Entity>();
  const challengeRating = useWatch({ control, name: "challengeRating" });

  const syncChallengeDerivedFields = React.useCallback((
    nextChallengeRating: number | null,
    options?: { shouldDirty?: boolean }
  ) => {
    const nextExperiencePoints =
      nextChallengeRating === null ? null : getMonsterXP(nextChallengeRating);
    const nextProficiencyBonus =
      nextChallengeRating === null ? null : calculateProficiencyBonus(nextChallengeRating);

    if (getValues("experiencePoints") !== nextExperiencePoints) {
      setValue("experiencePoints", nextExperiencePoints, options);
    }
    if (getValues("proficiencyBonus") !== nextProficiencyBonus) {
      setValue("proficiencyBonus", nextProficiencyBonus, options);
    }
  }, [getValues, setValue]);

  const handleChallengeRatingChange = React.useCallback((value: string) => {
    const nextChallengeRating = value ? parseFloat(value) : null;
    setValue("challengeRating", nextChallengeRating, { shouldDirty: true });
    syncChallengeDerivedFields(nextChallengeRating, { shouldDirty: true });
  }, [setValue, syncChallengeDerivedFields]);

  return (
    <FormSection title="Challenge & Experience" iconCategory="dice" iconName="d20">
      <div className="space-y-2">
        <Label htmlFor="challengeRating">Challenge Rating</Label>
        <Select
          value={challengeRating?.toString() ?? ""}
          onValueChange={handleChallengeRatingChange}
        >
          <SelectTrigger id="challengeRating">
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
          readOnly
          className="bg-muted/40 cursor-not-allowed"
        />
        <p className="text-xs text-muted-foreground">Derived from CR</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="proficiencyBonus">Proficiency Bonus</Label>
        <Input
          id="proficiencyBonus"
          type="number"
          {...register("proficiencyBonus", { valueAsNumber: true })}
          readOnly
          className="bg-muted/40 cursor-not-allowed"
        />
        <p className="text-xs text-muted-foreground">Derived from CR</p>
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
