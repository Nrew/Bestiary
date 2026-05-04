import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

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
  getExperiencePoints,
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
  const result = text.replace(/([A-Z])/g, " $1");
  return result.charAt(0).toUpperCase() + result.slice(1);
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

export function formatCR(cr: number): string {
  if (cr === 0.125) return "1/8";
  if (cr === 0.25) return "1/4";
  if (cr === 0.5) return "1/2";
  return String(cr);
};

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function generateUuid(): string {
  return crypto.randomUUID();
}
