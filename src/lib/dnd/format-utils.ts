import type { AbilityUses, MagicSchool, StatValue } from "@/types";
import { MAGIC_SCHOOL_LABELS } from "./constants";
import { ordinalize } from "@/lib/utils";

export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`);
}

export function formatStatValue(stat: StatValue): string {
  switch (stat.type) {
    case "flat":
      return stat.value >= 0 ? `+${stat.value}` : `${stat.value}`;
    case "percentAdd":
      return `+${stat.value}%`;
    case "percentMult":
      return `×${stat.value}%`;
    default:
      return assertNever(stat);
  }
}

export function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "[Complex Object]";
    }
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }
  if (typeof value === "symbol") {
    return value.description ? `Symbol(${value.description})` : "Symbol";
  }
  return "[Function]";
}

export function formatBonus(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

export function formatSpellLevel(
  level: number | null | undefined,
  school?: MagicSchool | null,
): string {
  if (level == null && !school) return "";
  if (level === 0) {
    return school ? `${MAGIC_SCHOOL_LABELS[school]} Cantrip` : "Cantrip";
  }
  if (level == null) {
    return school ? MAGIC_SCHOOL_LABELS[school] : "";
  }
  const ordinal = ordinalize(level);
  return school ? `${ordinal}-level ${MAGIC_SCHOOL_LABELS[school]}` : `${ordinal}-level`;
}

export function formatAbilityUses(uses: AbilityUses | null): string | null {
  if (!uses) return null;
  switch (uses.kind) {
    case "recharge":
      return uses.min === uses.max
        ? `Recharge ${uses.min}`
        : `Recharge ${uses.min}-${uses.max}`;
    case "perDay":
      return `${uses.count}/Day`;
    case "perRest": {
      const restWord = uses.rest === "dawn" ? "dawn" : `${uses.rest} rest`;
      return `${uses.count}/${restWord}`;
    }
    case "atWill":
      return "At Will";
    case "once":
      return "Once";
    default:
      return assertNever(uses);
  }
}

export function isNegativeStatValue(stat: StatValue): boolean {
  switch (stat.type) {
    case "flat":
    case "percentAdd":
      return stat.value < 0;
    case "percentMult":
      return stat.value < 100;
    default:
      return assertNever(stat);
  }
}
