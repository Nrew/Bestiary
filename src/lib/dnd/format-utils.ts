import type { StatValue } from "@/types";

/**
 * Helper for exhaustive switch statements.
 * TypeScript will error at compile time if a case is missing.
 */
function assertNever(value: never): never {
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

/** Stringifies any value for display. Objects are JSON-serialized; circular refs fall back to "[Complex Object]". */
export function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      // Handle circular references gracefully
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

/** Used for color-coding modifiers. percentMult < 100 is negative (e.g. 50 = halved). */
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
