import { CR_TO_XP, CR_OPTIONS } from "./constants";
import type { Attribute, EntitySize } from "@/types";


/** How a creature contributes its proficiency bonus to a skill or save. */
export type ProficiencyLevel = "none" | "half" | "proficient" | "expertise";

/** Armor categories from the SRD. Determines dexterity contribution to AC. */
export type ArmorType = "none" | "light" | "medium" | "heavy";

/** How a damage resistance affects a raw damage value. */
export type DamageModifierType = "vulnerable" | "resistant" | "immune";


/** SRD: modifier = floor((score - 10) / 2). */
export function calculateAbilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

/** Formats an ability modifier with its sign: "+2", "-1", "+0". */
export function formatAbilityModifier(score: number): string {
  const mod = calculateAbilityModifier(score);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}


/** SRD Table: Proficiency Bonus by Character Level / Monster CR. */
export function calculateProficiencyBonus(cr: number): number {
  if (cr <= 4)  return 2;
  if (cr <= 8)  return 3;
  if (cr <= 12) return 4;
  if (cr <= 16) return 5;
  if (cr <= 20) return 6;
  if (cr <= 24) return 7;
  if (cr <= 28) return 8;
  return 9;
}

/** Formats a CR as a human-readable fraction or integer: "1/8", "1/4", "1/2", "5". */
export function formatChallengeRating(cr: number): string {
  if (cr === 0.125) return "1/8";
  if (cr === 0.25)  return "1/4";
  if (cr === 0.5)   return "1/2";
  return cr.toString();
}

/** Returns the XP award for defeating a monster of the given CR. */
export function getExperiencePoints(cr: number): number {
  return CR_TO_XP[cr] ?? 0;
}


/** SRD: Save DC = 8 + proficiency bonus + ability modifier. */
export function calculateSaveDC(abilityScore: number, proficiencyBonus: number): number {
  return 8 + calculateAbilityModifier(abilityScore) + proficiencyBonus;
}

/** Attack bonus = ability modifier + (proficiency bonus if proficient). */
export function calculateAttackBonus(
  abilityScore: number,
  proficiencyBonus: number,
  isProficient = true
): number {
  return calculateAbilityModifier(abilityScore) + (isProficient ? proficiencyBonus : 0);
}

/** Attack modifier with an optional magic weapon bonus (+1, +2, +3). */
export function calculateAttackModifier(
  abilityScore: number,
  proficiencyBonus: number,
  isProficient = true,
  magicBonus = 0
): number {
  return calculateAttackBonus(abilityScore, proficiencyBonus, isProficient) + magicBonus;
}

/**
 * Skill modifier with the four proficiency tiers.
 * Returns the total bonus added to a d20 roll for that skill check.
 */
export function calculateSkillModifier(
  abilityScore: number,
  proficiencyBonus: number,
  proficiencyLevel: ProficiencyLevel = "none"
): number {
  const base = calculateAbilityModifier(abilityScore);
  switch (proficiencyLevel) {
    case "half":       return base + Math.floor(proficiencyBonus / 2);
    case "proficient": return base + proficiencyBonus;
    case "expertise":  return base + proficiencyBonus * 2;
    default:           return base;
  }
}

/**
 * Passive check score for any skill.
 * SRD: passive score = 10 + skill modifier.
 * Use for passive Perception, passive Investigation, passive Insight, etc.
 */
export function calculatePassiveCheck(skillModifier: number): number {
  return 10 + skillModifier;
}

/**
 * Passive Perception convenience wrapper; takes raw Wisdom
 * and proficiency rather than a pre-computed modifier.
 */
export function calculatePassivePerception(
  wisdom: number,
  proficiencyBonus: number,
  isProficient = true
): number {
  return calculatePassiveCheck(
    calculateSkillModifier(wisdom, proficiencyBonus, isProficient ? "proficient" : "none")
  );
}

/**
 * Concentration saving throw DC when a spellcaster takes damage.
 * SRD: DC = max(10, ⌊damage ÷ 2⌋).
 */
export function calculateConcentrationDC(damageTaken: number): number {
  return Math.max(10, Math.floor(damageTaken / 2));
}

/**
 * Initiative modifier = Dexterity modifier.
 * Explicit function so callsites are clearly domain-named.
 */
export function calculateInitiativeModifier(dexterity: number): number {
  return calculateAbilityModifier(dexterity);
}

/**
 * Armor Class calculation by armor type.
 * - none/natural armor: 10 + Dex mod + natural armor bonus
 * - light: base AC + Dex mod
 * - medium: base AC + min(Dex mod, 2)
 * - heavy: base AC only
 */
export function calculateArmorClass(
  baseAC: number,
  dexterityModifier: number,
  armorType: ArmorType = "none",
  shield = false,
  naturalArmor = 0
): number {
  let ac = baseAC;
  switch (armorType) {
    case "none":   ac = 10 + dexterityModifier + naturalArmor; break;
    case "light":  ac += dexterityModifier; break;
    case "medium": ac += Math.min(dexterityModifier, 2); break;
    // heavy: no dexterity contribution
  }
  return shield ? ac + 2 : ac;
}


/** Maps each D&D 5e skill (camelCase) to its governing ability score. */
export const SKILL_ABILITIES: Readonly<Record<string, Attribute>> = {
  acrobatics:    "dexterity",
  animalHandling:"wisdom",
  arcana:        "intelligence",
  athletics:     "strength",
  deception:     "charisma",
  history:       "intelligence",
  insight:       "wisdom",
  intimidation:  "charisma",
  investigation: "intelligence",
  medicine:      "wisdom",
  nature:        "intelligence",
  perception:    "wisdom",
  performance:   "charisma",
  persuasion:    "charisma",
  religion:      "intelligence",
  sleightOfHand: "dexterity",
  stealth:       "dexterity",
  survival:      "wisdom",
} as const;


interface ParsedDice {
  numDice: number;
  dieSize: number;
  modifier: number;
}

function parseDiceFormula(formula: string): ParsedDice {
  const match = formula.match(/^(\d+)d(\d+)(?:([+-])(\d+))?$/);
  if (!match) throw new Error(`Invalid dice formula: "${formula}"`);
  const [, n, d, op, mod] = match;
  return {
    numDice:  parseInt(n, 10),
    dieSize:  parseInt(d, 10),
    modifier: mod ? parseInt(mod, 10) * (op === "+" ? 1 : -1) : 0,
  };
}

export interface ParsedDamageFormula extends ParsedDice {
  /** Statistically expected value (rounded down). */
  average: number;
}

/** Parses a dice formula and computes the statistical average damage. */
export function parseDamageFormula(formula: string): ParsedDamageFormula {
  const { numDice, dieSize, modifier } = parseDiceFormula(formula);
  return {
    numDice,
    dieSize,
    modifier,
    average: Math.floor(numDice * ((dieSize + 1) / 2) + modifier),
  };
}

/** Sums the average damage of multiple damage components (e.g., multi-type attacks). */
export function calculateTotalAverageDamage(
  damages: ReadonlyArray<{ formula: string; type: string }>
): number {
  return damages.reduce<number>((total, d) => {
    try { return total + parseDamageFormula(d.formula).average; }
    catch { return total; }
  }, 0);
}

/** Applies a resistance/immunity/vulnerability modifier to a raw damage value. */
export function applyDamageModifier(
  damage: number,
  modifier: DamageModifierType
): number {
  switch (modifier) {
    case "vulnerable": return damage * 2;
    case "resistant":  return Math.floor(damage / 2);
    case "immune":     return 0;
  }
}

export function isValidDiceFormula(formula: string): boolean {
  try { parseDiceFormula(formula); return true; }
  catch { return false; }
}

/** Validates a range string per SRD formats: "60 ft.", "touch", "self", etc. */
export function isValidRange(range: string): boolean {
  return /^(\d+\s*ft\.?|touch|self|sight|unlimited)$/i.test(range);
}


export interface HPCalculation {
  /** Statistically expected HP (most likely value). */
  average: number;
  /** All dice roll minimum (all 1s). */
  minimum: number;
  /** All dice roll maximum (all max). */
  maximum: number;
  /** Hit dice notation string, e.g. "10d10". */
  hitDice: string;
}

/** Computes the full HP range from hit dice and constitution modifier. */
export function calculateHitPoints(
  hitDiceCount: number,
  hitDieSize: number,
  constitutionModifier: number
): HPCalculation {
  const avgPerDie = (hitDieSize + 1) / 2;
  return {
    average: Math.max(1, Math.floor(hitDiceCount * (avgPerDie + constitutionModifier))),
    minimum: Math.max(1, hitDiceCount * (1 + constitutionModifier)),
    maximum: Math.max(1, hitDiceCount * (hitDieSize + constitutionModifier)),
    hitDice: `${hitDiceCount}d${hitDieSize}`,
  };
}

/** Returns the hit die size for a creature of the given size (SRD p. 7). */
export function getHitDieFromSize(size: EntitySize): number {
  const map: Record<EntitySize, number> = {
    tiny:       4,
    small:      6,
    medium:     8,
    large:      10,
    huge:       12,
    gargantuan: 20,
  };
  return map[size];
}

/** Estimates the number of hit dice a creature of a given size needs to reach a target HP. */
export function estimateHitDiceCount(
  hp: number,
  size: EntitySize,
  constitutionModifier: number
): number {
  const dieSize = getHitDieFromSize(size);
  const hpPerDie = (dieSize + 1) / 2 + constitutionModifier;
  return Math.max(1, Math.round(hp / hpPerDie));
}


/** Expected statistics for a monster of a given CR (DMG Table, p. 274). */
export interface MonsterStatProfile {
  readonly profBonus:    number;
  /** Baseline Armor Class the DMG table expects. */
  readonly acExpected:   number;
  readonly hpMin:        number;
  readonly hpMax:        number;
  /** Expected attack bonus (to hit). */
  readonly attackBonus:  number;
  /** Expected damage per round (averaged over 3 rounds), low end. */
  readonly dprMin:       number;
  /** Expected damage per round (averaged over 3 rounds), high end. */
  readonly dprMax:       number;
  /** Expected save DC (if the monster forces saving throws). */
  readonly saveDC:       number;
}

// Encoded directly from DMG 2014, Table: Monster Statistics by Challenge Rating, p. 274.
const DMG_STATS = new Map<number, MonsterStatProfile>([
  [0,     { profBonus: 2, acExpected: 13, hpMin:   1, hpMax:   6, attackBonus:  3, dprMin:   0, dprMax:   1, saveDC: 13 }],
  [0.125, { profBonus: 2, acExpected: 13, hpMin:   7, hpMax:  35, attackBonus:  3, dprMin:   2, dprMax:   3, saveDC: 13 }],
  [0.25,  { profBonus: 2, acExpected: 13, hpMin:  36, hpMax:  49, attackBonus:  3, dprMin:   4, dprMax:   5, saveDC: 13 }],
  [0.5,   { profBonus: 2, acExpected: 13, hpMin:  50, hpMax:  70, attackBonus:  3, dprMin:   6, dprMax:   8, saveDC: 13 }],
  [1,     { profBonus: 2, acExpected: 13, hpMin:  71, hpMax:  85, attackBonus:  3, dprMin:   9, dprMax:  14, saveDC: 13 }],
  [2,     { profBonus: 2, acExpected: 13, hpMin:  86, hpMax: 100, attackBonus:  3, dprMin:  15, dprMax:  20, saveDC: 13 }],
  [3,     { profBonus: 2, acExpected: 13, hpMin: 101, hpMax: 115, attackBonus:  4, dprMin:  21, dprMax:  26, saveDC: 13 }],
  [4,     { profBonus: 2, acExpected: 14, hpMin: 116, hpMax: 130, attackBonus:  5, dprMin:  27, dprMax:  32, saveDC: 14 }],
  [5,     { profBonus: 3, acExpected: 15, hpMin: 131, hpMax: 145, attackBonus:  6, dprMin:  33, dprMax:  38, saveDC: 15 }],
  [6,     { profBonus: 3, acExpected: 15, hpMin: 146, hpMax: 160, attackBonus:  6, dprMin:  39, dprMax:  44, saveDC: 15 }],
  [7,     { profBonus: 3, acExpected: 15, hpMin: 161, hpMax: 175, attackBonus:  6, dprMin:  45, dprMax:  50, saveDC: 15 }],
  [8,     { profBonus: 3, acExpected: 16, hpMin: 176, hpMax: 190, attackBonus:  7, dprMin:  51, dprMax:  56, saveDC: 16 }],
  [9,     { profBonus: 4, acExpected: 16, hpMin: 191, hpMax: 205, attackBonus:  7, dprMin:  57, dprMax:  62, saveDC: 16 }],
  [10,    { profBonus: 4, acExpected: 17, hpMin: 206, hpMax: 220, attackBonus:  7, dprMin:  63, dprMax:  68, saveDC: 16 }],
  [11,    { profBonus: 4, acExpected: 17, hpMin: 221, hpMax: 235, attackBonus:  8, dprMin:  69, dprMax:  74, saveDC: 17 }],
  [12,    { profBonus: 4, acExpected: 17, hpMin: 236, hpMax: 250, attackBonus:  8, dprMin:  75, dprMax:  80, saveDC: 17 }],
  [13,    { profBonus: 5, acExpected: 18, hpMin: 251, hpMax: 265, attackBonus:  8, dprMin:  81, dprMax:  86, saveDC: 18 }],
  [14,    { profBonus: 5, acExpected: 18, hpMin: 266, hpMax: 280, attackBonus:  8, dprMin:  87, dprMax:  92, saveDC: 18 }],
  [15,    { profBonus: 5, acExpected: 18, hpMin: 281, hpMax: 295, attackBonus:  8, dprMin:  93, dprMax:  98, saveDC: 18 }],
  [16,    { profBonus: 5, acExpected: 18, hpMin: 296, hpMax: 310, attackBonus:  9, dprMin:  99, dprMax: 104, saveDC: 18 }],
  [17,    { profBonus: 6, acExpected: 19, hpMin: 311, hpMax: 325, attackBonus: 10, dprMin: 105, dprMax: 110, saveDC: 19 }],
  [18,    { profBonus: 6, acExpected: 19, hpMin: 326, hpMax: 340, attackBonus: 10, dprMin: 111, dprMax: 116, saveDC: 19 }],
  [19,    { profBonus: 6, acExpected: 19, hpMin: 341, hpMax: 355, attackBonus: 10, dprMin: 117, dprMax: 122, saveDC: 19 }],
  [20,    { profBonus: 6, acExpected: 19, hpMin: 356, hpMax: 400, attackBonus: 10, dprMin: 123, dprMax: 140, saveDC: 19 }],
  [21,    { profBonus: 7, acExpected: 19, hpMin: 401, hpMax: 445, attackBonus: 11, dprMin: 141, dprMax: 158, saveDC: 20 }],
  [22,    { profBonus: 7, acExpected: 19, hpMin: 446, hpMax: 490, attackBonus: 11, dprMin: 159, dprMax: 176, saveDC: 20 }],
  [23,    { profBonus: 7, acExpected: 19, hpMin: 491, hpMax: 535, attackBonus: 11, dprMin: 177, dprMax: 194, saveDC: 20 }],
  [24,    { profBonus: 7, acExpected: 19, hpMin: 536, hpMax: 580, attackBonus: 12, dprMin: 195, dprMax: 212, saveDC: 21 }],
  [25,    { profBonus: 8, acExpected: 19, hpMin: 581, hpMax: 625, attackBonus: 12, dprMin: 213, dprMax: 230, saveDC: 21 }],
  [26,    { profBonus: 8, acExpected: 19, hpMin: 626, hpMax: 670, attackBonus: 12, dprMin: 231, dprMax: 248, saveDC: 21 }],
  [27,    { profBonus: 8, acExpected: 19, hpMin: 671, hpMax: 715, attackBonus: 13, dprMin: 249, dprMax: 266, saveDC: 22 }],
  [28,    { profBonus: 8, acExpected: 19, hpMin: 716, hpMax: 760, attackBonus: 13, dprMin: 267, dprMax: 284, saveDC: 22 }],
  [29,    { profBonus: 9, acExpected: 19, hpMin: 761, hpMax: 805, attackBonus: 13, dprMin: 285, dprMax: 302, saveDC: 22 }],
  [30,    { profBonus: 9, acExpected: 19, hpMin: 806, hpMax: 850, attackBonus: 14, dprMin: 303, dprMax: 320, saveDC: 23 }],
]);

/**
 * Returns the DMG expected statistics for a monster at the given CR,
 * or `null` for CRs outside the standard 0-30 range.
 */
export function getMonsterStatsByCR(cr: number): MonsterStatProfile | null {
  return DMG_STATS.get(cr) ?? null;
}

/**
 * Snaps a calculated CR to the nearest valid D&D 5e CR value.
 * When equidistant between two CRs, the higher one is chosen (conventional
 * half-up rounding), matching how the DMG's own CR calculator behaves.
 */
function snapToCR(rawCR: number): number {
  const options = CR_OPTIONS as ReadonlyArray<number>;
  return options.reduce((best, curr) =>
    Math.abs(curr - rawCR) <= Math.abs(best - rawCR) ? curr : best
  );
}

/**
 * Estimates the defensive CR of a monster from its HP and AC (DMG p. 274).
 *
 * Algorithm:
 * 1. Find the CR where HP falls within the expected HP range.
 * 2. Compare actual AC to the expected AC for that CR.
 * 3. Every 2 points AC exceeds (or falls below) the expectation adjusts CR by ±1.
 *
 * Returns a snapped value from CR_OPTIONS (0, 1/8, 1/4, ..., 30).
 */
export function estimateDefensiveCR(hp: number, ac: number): number {
  // Walk the table to find the first CR whose HP range contains this HP value.
  // The outer assignment (outside the if) tracks the last entry visited so that
  // HP values above all table ranges map to the highest CR rather than zero.
  let baseCRIndex = 0;
  const entries = [...DMG_STATS.entries()];
  for (let i = 0; i < entries.length; i++) {
    const [, stats] = entries[i];
    if (hp <= stats.hpMax) { baseCRIndex = i; break; }
    baseCRIndex = i;
  }

  const baseCREntry = entries[baseCRIndex];
  if (!baseCREntry) return 0;

  const [baseCR, stats] = baseCREntry;
  const acDiff = ac - stats.acExpected;
  const crAdjust = Math.floor(acDiff / 2);  // +1 CR per 2 AC above expected

  return snapToCR(baseCR + crAdjust);
}

/**
 * Estimates the offensive CR from average damage per round (averaged over 3
 * rounds) and optionally the creature's attack bonus or save DC (DMG p. 274).
 *
 * The DMG compares attack bonus to expected attack bonus, and save DC to
 * expected save DC, independently. Pass whichever the creature primarily uses.
 * Every 2 points above or below the expected value adjusts the CR by ±1.
 *
 * @param dpr            Average damage per round (3-round average).
 * @param attackBonus    Creature's primary attack bonus, if it uses attack rolls.
 * @param saveDC         Creature's primary save DC, if it forces saving throws.
 */
export function estimateOffensiveCR(
  dpr: number,
  { attackBonus, saveDC }: { attackBonus?: number; saveDC?: number } = {}
): number {
  const entries = [...DMG_STATS.entries()];

  let baseCRIndex = 0;
  for (let i = 0; i < entries.length; i++) {
    const [, stats] = entries[i];
    if (dpr <= stats.dprMax) { baseCRIndex = i; break; }
    baseCRIndex = i;
  }

  const baseCREntry = entries[baseCRIndex];
  if (!baseCREntry) return 0;

  const [baseCR, stats] = baseCREntry;

  let crAdjust = 0;
  if (attackBonus !== undefined) {
    crAdjust = Math.floor((attackBonus - stats.attackBonus) / 2);
  } else if (saveDC !== undefined) {
    crAdjust = Math.floor((saveDC - stats.saveDC) / 2);
  }

  return snapToCR(baseCR + crAdjust);
}

/**
 * Combines defensive and offensive CR into the final monster CR.
 * DMG rule: average the two, then snap to the nearest valid CR.
 */
export function estimateMonsterCR(defensiveCR: number, offensiveCR: number): number {
  return snapToCR((defensiveCR + offensiveCR) / 2);
}


/** XP reward for a monster at the given CR. Uses the single authoritative CR_TO_XP table. */
export function getMonsterXP(cr: number | null): number {
  if (cr === null) return 0;
  if (cr < 0)      return CR_TO_XP[0] ?? 0;
  return CR_TO_XP[cr] ?? 0;
}

export type EncounterDifficulty = "trivial" | "easy" | "medium" | "hard" | "deadly";

export interface EncounterThresholds {
  easy:   number;
  medium: number;
  hard:   number;
  deadly: number;
}

export interface EncounterResult {
  difficulty:  EncounterDifficulty;
  adjustedXp:  number;
  rawXp:       number;
  thresholds:  EncounterThresholds;
  multiplier:  number;
}

// DMG Table: XP Thresholds by Character Level, p. 82.
// Tuple layout: [easy, medium, hard, deadly]
const XP_THRESHOLDS_BY_LEVEL: Readonly<Record<number, readonly [number, number, number, number]>> = {
   1: [25,   50,   75,   100],  2: [50,   100,  150,  200],
   3: [75,   150,  225,  400],  4: [125,  250,  375,  500],
   5: [250,  500,  750,  1100], 6: [300,  600,  900,  1400],
   7: [350,  750,  1100, 1700], 8: [450,  900,  1400, 2100],
   9: [550,  1100, 1600, 2400], 10: [600, 1200, 1900, 2800],
  11: [800,  1600, 2400, 3600], 12: [1000, 2000, 3000, 4500],
  13: [1100, 2200, 3400, 5100], 14: [1250, 2500, 3800, 5700],
  15: [1400, 2800, 4300, 6400], 16: [1600, 3200, 4800, 7200],
  17: [2000, 3900, 5900, 8800], 18: [2100, 4200, 6300, 9500],
  19: [2400, 4900, 7300, 10900], 20: [2800, 5700, 8500, 12700],
} as const;

/** Sums the XP difficulty thresholds for an entire party. */
export function calculateXPThresholds(partyLevels: readonly number[]): EncounterThresholds {
  const t: EncounterThresholds = { easy: 0, medium: 0, hard: 0, deadly: 0 };
  for (const level of partyLevels) {
    const clamped = Math.max(1, Math.min(20, level));
    const [e, m, h, d] = XP_THRESHOLDS_BY_LEVEL[clamped] ?? [0, 0, 0, 0];
    t.easy += e; t.medium += m; t.hard += h; t.deadly += d;
  }
  return t;
}

// DMG Table: Encounter Multipliers by monster count, p. 82.
function encounterMultiplier(count: number): number {
  if (count <= 1)  return 1;
  if (count <= 2)  return 1.5;
  if (count <= 6)  return 2;
  if (count <= 10) return 2.5;
  if (count <= 14) return 3;
  return 4;
}

/** Full encounter difficulty result for a party vs a group of monsters. */
export function calculateEncounterDifficulty(
  partyLevels: readonly number[],
  monsterCRs:  ReadonlyArray<number | null>
): EncounterResult {
  const rawXp      = monsterCRs.reduce<number>((sum, cr) => sum + getMonsterXP(cr), 0);
  const multiplier = encounterMultiplier(monsterCRs.length);
  const adjustedXp = Math.round(rawXp * multiplier);
  const thresholds = calculateXPThresholds(partyLevels);

  let difficulty: EncounterDifficulty;
  if      (adjustedXp >= thresholds.deadly) difficulty = "deadly";
  else if (adjustedXp >= thresholds.hard)   difficulty = "hard";
  else if (adjustedXp >= thresholds.medium) difficulty = "medium";
  else if (adjustedXp >= thresholds.easy)   difficulty = "easy";
  else                                       difficulty = "trivial";

  return { difficulty, adjustedXp, rawXp, thresholds, multiplier };
}
