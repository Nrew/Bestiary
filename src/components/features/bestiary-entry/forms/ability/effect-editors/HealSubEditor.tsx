import React from "react";
import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Ability } from "@/types";

export const HealSubEditor: React.FC<{ index: number }> = ({ index }) => {
  const { register } = useFormContext<Ability>();
  const formulaId = `effect-${index}-heal-formula`;

  return (
    <div className="space-y-2">
      <Label htmlFor={formulaId}>Healing Formula</Label>
      <Input id={formulaId} {...register(`effects.${index}.formula`)} placeholder="e.g., 2d8 + 4" autoComplete="off" />
    </div>
  );
};
