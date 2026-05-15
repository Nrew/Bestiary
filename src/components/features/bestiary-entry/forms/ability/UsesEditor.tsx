import { useFormContext, useWatch } from "react-hook-form";
import type { AbilityUses, RestType } from "@/types";
import type { AbilityFormData } from "@/types/schemas";
import { useGameEnums } from "@/store/appStore";
import { REST_TYPE_LABELS } from "@/lib/dnd/constants";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type UsesKind = AbilityUses["kind"] | "none";

const KIND_OPTIONS: { value: UsesKind; label: string }[] = [
  { value: "none", label: "Unlimited" },
  { value: "atWill", label: "At Will" },
  { value: "once", label: "Once" },
  { value: "perDay", label: "Per Day" },
  { value: "perRest", label: "Per Rest" },
  { value: "recharge", label: "Recharge (dice)" },
];

const DEFAULTS_BY_KIND: Record<Exclude<UsesKind, "none">, AbilityUses> = {
  atWill: { kind: "atWill" },
  once: { kind: "once" },
  perDay: { kind: "perDay", count: 1 },
  perRest: { kind: "perRest", count: 1, rest: "short" },
  recharge: { kind: "recharge", min: 5, max: 6 },
};

export function UsesEditor() {
  const { control, setValue } = useFormContext<AbilityFormData>();
  const uses = useWatch({ control, name: "uses" });
  const gameEnums = useGameEnums();
  const currentKind: UsesKind = uses?.kind ?? "none";

  const onKindChange = (kind: UsesKind) => {
    setValue(
      "uses",
      kind === "none" ? null : DEFAULTS_BY_KIND[kind],
      { shouldDirty: true }
    );
  };
  const patch = (partial: Partial<AbilityUses>) => {
    if (!uses) return;
    setValue("uses", { ...uses, ...partial } as AbilityUses, { shouldDirty: true });
  };

  const restTypes: RestType[] = gameEnums?.restTypes ?? ["short", "long", "dawn"];

  return (
    <div className="space-y-2">
      <Label htmlFor="uses-kind">Uses</Label>
      <Select value={currentKind} onValueChange={(v) => onKindChange(v as UsesKind)}>
        <SelectTrigger id="uses-kind">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {KIND_OPTIONS.map(o =>
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          )}
        </SelectContent>
      </Select>

      {uses?.kind === "recharge" && (
        <div className="grid h-15 grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="uses-recharge-min">Min</Label>
            <Input
              id="uses-recharge-min"
              type="number" min={1} max={6}
              value={uses.min}
              onChange={(e) => {
                const v = Number(e.target.value);
                patch({ min: Number.isFinite(v) ? v : 1 });
              }}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="uses-recharge-max">Max</Label>
            <Input
              id="uses-recharge-max"
              type="number" min={1} max={6}
              value={uses.max}
              onChange={(e) => {
                const v = Number(e.target.value);
                patch({ max: Number.isFinite(v) ? v : 6 });
              }}
            />
          </div>
        </div>
      )}

      {uses?.kind === "perDay" && (
        <div className="grid h-15 grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="uses-perday-count">Count</Label>
            <Input
              id="uses-perday-count"
              type="number" min={1}
              value={uses.count}
              onChange={(e) => {
                const v = Number(e.target.value);
                patch({ count: Number.isFinite(v) ? v : 1 });
              }}
            />
          </div>
        </div>
      )}

      {uses?.kind === "perRest" && (
        <div className="grid h-15 grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="uses-perrest-count">Count</Label>
            <Input
              id="uses-perrest-count"
              type="number" min={1}
              value={uses.count}
              onChange={(e) => {
                const v = Number(e.target.value);
                patch({ count: Number.isFinite(v) ? v : 1 });
              }}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="uses-perrest-rest">Rest</Label>
            <Select
              value={uses.rest}
              onValueChange={(v) => patch({ rest: v as RestType })}
            >
              <SelectTrigger id="uses-perrest-rest">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {restTypes.map(r =>
                  <SelectItem key={r} value={r}>{REST_TYPE_LABELS[r]}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}
