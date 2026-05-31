import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { CR_FRACTION_DISPLAY } from "@/lib/dnd/constants";

export {
  isEntity,
  isItem,
  isStatus,
  isAbility,
  getEntryContext as getEntryType,
  isViewContext,
} from './type-guards';

export {
  calculateAbilityModifier,
  formatAbilityModifier,
  formatChallengeRating,
  calculateProficiencyBonus,
  calculateSaveDC,
  calculateAttackBonus,
} from './dnd';

export { getErrorMessage, formatErrorMessage } from './errors';

// === String helpers ===

export function capitalize(text: string): string {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatLabel(text: string): string {
  if (!text) return "";
  return text
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());
}

/**
 * Strip HTML tags from a string.
 * Uses DOMParser in browser environments, falls back to regex in non-browser contexts.
 */
export function stripHtml(html: string): string {
  if (!html) return "";

  // Use DOMParser if available (browser environment)
  if (typeof DOMParser !== "undefined") {
    try {
      const doc = new DOMParser().parseFromString(html, "text/html");
      return doc.body.textContent || "";
    } catch {
      // Fall through to regex fallback
    }
  }

  // Regex fallback for non-browser environments or parsing errors
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .trim();
}

// === Number helpers ===

export function ordinalize(n: number): string {
  const s = ["th","st","nd","rd"];
  const v = n % 100;
  const suffix = s[(v - 20) % 10] ?? s[v] ?? s[0];
  return `${n}${suffix}`;
}

export function formatCR(cr: number): string {
  return CR_FRACTION_DISPLAY[cr] ?? cr.toString();
}

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function generateUuid(): string {
  return crypto.randomUUID();
}
