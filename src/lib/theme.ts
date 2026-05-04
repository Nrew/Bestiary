import type { ThreatLevel, Rarity } from "@/types";

// Classes are written as complete strings (not constructed dynamically) so
// Tailwind's content scanner can detect them at build time.
const THREAT_LEVEL_CLASS_MAP: Record<ThreatLevel, string> = {
  trivial: "text-stone bg-stone/10 border-stone/30",
  easy: "text-jade bg-jade/10 border-jade/30",
  medium: "text-rune bg-rune/10 border-rune/30",
  hard: "text-copper bg-copper/10 border-copper/30",
  deadly: "text-wine bg-wine/10 border-wine/30",
  legendary: "text-violet bg-violet/10 border-violet/30",
};

const RARITY_CLASS_MAP: Record<Rarity, string> = {
  common: "text-stone bg-stone/10 border-stone/30",
  uncommon: "text-jade bg-jade/10 border-jade/30",
  rare: "text-sapphire bg-sapphire/10 border-sapphire/30",
  veryRare: "text-violet bg-violet/10 border-violet/30",
  legendary: "text-rune bg-rune/10 border-rune/30",
  mythic: "text-copper bg-copper/10 border-copper/30",
  unique: "text-wine bg-wine/10 border-wine/30",
};

export const getThreatClassName = (
  threatId: ThreatLevel | null
): string => {
  if (!threatId || !THREAT_LEVEL_CLASS_MAP[threatId]) {
    return "text-muted-foreground";
  }
  return THREAT_LEVEL_CLASS_MAP[threatId];
};

export const getRarityClassName = (
  rarityId: Rarity | null
): string => {
  if (!rarityId || !RARITY_CLASS_MAP[rarityId]) {
    return "text-muted-foreground";
  }
  return RARITY_CLASS_MAP[rarityId];
};

/** Signed modifier string for a score, or an empty-value marker for null/undefined. */
export const formatAbilityModifierDisplay = (score?: number | null): string => {
  if (score === null || typeof score === "undefined") {
    return "—";
  }
  const modifier = Math.floor((score - 10) / 2);
  return modifier >= 0 ? `+${modifier}` : `${modifier}`;
};

/** Semantic color tokens for toasts, alerts, and badges. */
export const SEMANTIC_COLORS = {
  success: {
    bg: "bg-jade/10",
    border: "border-jade/30",
    text: "text-jade",
    full: "bg-jade/10 border-jade/30 text-jade",
  },
  error: {
    bg: "bg-wine/10",
    border: "border-wine/30",
    text: "text-wine",
    full: "bg-wine/10 border-wine/30 text-wine",
  },
  warning: {
    bg: "bg-rune/10",
    border: "border-rune/30",
    text: "text-leather",
    full: "bg-rune/10 border-rune/30 text-leather",
  },
  info: {
    bg: "bg-sapphire/10",
    border: "border-sapphire/30",
    text: "text-sapphire",
    full: "bg-sapphire/10 border-sapphire/30 text-sapphire",
  },
} as const;

export type SemanticColorType = keyof typeof SEMANTIC_COLORS;

/**
 * Component-level style presets.
 * All color names reference CSS variables defined in index.css.
 */
export const COMPONENT_STYLES = {
  /** Stone-textured card style */
  stoneCard: "bg-stone/5 border border-stone/20 shadow-inner rounded-lg",
  /** Parchment-like surface style */
  parchmentCard: "bg-parchment/50 border border-leather/20 shadow-inner rounded-lg",
  /** Stat block container */
  statBlock: "bg-parchment/80 rounded-lg border-2 border-leather/30 p-4 font-serif text-foreground shadow-lg",
  /** Decorative divider line */
  divider: "my-3 h-px w-full bg-gradient-to-r from-transparent via-wine/50 to-transparent",
} as const;
