import type { ItemType, Rarity, AbilityType, AoeShape, DamageType, EntitySize, ThreatLevel, Attribute, ResistanceLevel } from "@/types";

/** SRD base modifier added to all spell/ability save DCs (PHB p. 205). */
export const SAVE_DC_BASE = 8;

/** SRD passive check base; passive score = this + skill modifier (PHB p. 175). */
export const PASSIVE_CHECK_BASE = 10;

/** SRD flat AC bonus granted by a shield (PHB p. 144). */
export const SHIELD_AC_BONUS = 2;

/** Human-readable strings for the three fractional CRs (SRD). */
export const CR_FRACTION_DISPLAY: Readonly<Record<number, string>> = {
  0.125: "1/8",
  0.25:  "1/4",
  0.5:   "1/2",
} as const;

export const PAGE_SIZE = 50;

export const ABILITY_SCORE_NAMES: Attribute[] = [
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
];

export const ABILITY_SCORE_LABELS: Record<Attribute, string> = {
  strength: "Strength",
  dexterity: "Dexterity",
  constitution: "Constitution",
  intelligence: "Intelligence",
  wisdom: "Wisdom",
  charisma: "Charisma",
};

export const ABILITY_SCORE_SHORT: Record<Attribute, string> = {
  strength: "STR",
  dexterity: "DEX",
  constitution: "CON",
  intelligence: "INT",
  wisdom: "WIS",
  charisma: "CHA",
};

/**
 * Single source of truth for all 18 D&D 5e skills.
 * SKILL_ABILITIES, SKILL_LABELS, and COMMON_SKILLS are all derived from this.
 */
const SKILL_DATA = {
  acrobatics:    { ability: "dexterity"    as Attribute, name: "Acrobatics"     },
  animalHandling:{ ability: "wisdom"       as Attribute, name: "Animal Handling" },
  arcana:        { ability: "intelligence" as Attribute, name: "Arcana"          },
  athletics:     { ability: "strength"     as Attribute, name: "Athletics"       },
  deception:     { ability: "charisma"     as Attribute, name: "Deception"       },
  history:       { ability: "intelligence" as Attribute, name: "History"         },
  insight:       { ability: "wisdom"       as Attribute, name: "Insight"         },
  intimidation:  { ability: "charisma"     as Attribute, name: "Intimidation"    },
  investigation: { ability: "intelligence" as Attribute, name: "Investigation"   },
  medicine:      { ability: "wisdom"       as Attribute, name: "Medicine"        },
  nature:        { ability: "intelligence" as Attribute, name: "Nature"          },
  perception:    { ability: "wisdom"       as Attribute, name: "Perception"      },
  performance:   { ability: "charisma"     as Attribute, name: "Performance"     },
  persuasion:    { ability: "charisma"     as Attribute, name: "Persuasion"      },
  religion:      { ability: "intelligence" as Attribute, name: "Religion"        },
  sleightOfHand: { ability: "dexterity"    as Attribute, name: "Sleight of Hand" },
  stealth:       { ability: "dexterity"    as Attribute, name: "Stealth"         },
  survival:      { ability: "wisdom"       as Attribute, name: "Survival"        },
};

export type SkillKey = keyof typeof SKILL_DATA;

/** Maps each skill to its governing ability score. Derived from SKILL_DATA. */
export const SKILL_ABILITIES: Readonly<Record<SkillKey, Attribute>> =
  Object.fromEntries(
    Object.entries(SKILL_DATA).map(([k, v]) => [k, v.ability])
  ) as Record<SkillKey, Attribute>;

/** All 18 skills in alphabetical order. Derived from SKILL_DATA. */
export const COMMON_SKILLS = Object.keys(SKILL_DATA).sort() as SkillKey[];

/** Display labels derived from SKILL_DATA. Format: "Skill Name (Abi)" */
export const SKILL_LABELS: Readonly<Record<SkillKey, string>> =
  Object.fromEntries(
    Object.entries(SKILL_DATA).map(([k, v]) => {
      const short = ABILITY_SCORE_SHORT[v.ability]; // e.g. "DEX"
      const abbr = short.charAt(0) + short.slice(1).toLowerCase(); // "Dex"
      return [k, `${v.name} (${abbr})`];
    })
  ) as Record<SkillKey, string>;

export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  weapon: "Weapon",
  armor: "Armor",
  consumable: "Consumable",
  trinket: "Trinket",
  material: "Material",
  organic: "Organic",
  tool: "Tool",
};

export const RARITY_LABELS: Record<Rarity, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  veryRare: "Very Rare",
  legendary: "Legendary",
  mythic: "Mythic",
  unique: "Unique",
};

/**
 * Standard 5e alignments + common variants. Stored as free-form text on the
 * entity (`alignment: string | null`); homebrew values work too. The dropdown
 * offers these options but the field accepts free-form text.
 */
export const ALIGNMENT_OPTIONS: ReadonlyArray<string> = [
  "Lawful Good",
  "Neutral Good",
  "Chaotic Good",
  "Lawful Neutral",
  "True Neutral",
  "Chaotic Neutral",
  "Lawful Evil",
  "Neutral Evil",
  "Chaotic Evil",
  "Unaligned",
  "Any Alignment",
];

export const ABILITY_TYPE_LABELS: Record<AbilityType, string> = {
  action: "Action",
  bonusAction: "Bonus Action",
  reaction: "Reaction",
  passive: "Passive",
  legendary: "Legendary",
  mythic: "Mythic",
  lair: "Lair Action",
};

export const AOE_SHAPE_LABELS: Record<AoeShape, string> = {
  sphere: "Sphere",
  cube: "Cube",
  cone: "Cone",
  line: "Line",
  cylinder: "Cylinder",
};

export const DAMAGE_TYPE_LABELS: Record<DamageType, string> = {
  acid: "Acid",
  bludgeoning: "Bludgeoning",
  cold: "Cold",
  fire: "Fire",
  force: "Force",
  lightning: "Lightning",
  necrotic: "Necrotic",
  piercing: "Piercing",
  poison: "Poison",
  psychic: "Psychic",
  radiant: "Radiant",
  slashing: "Slashing",
  thunder: "Thunder",
};

export const ENTITY_SIZE_LABELS: Record<EntitySize, string> = {
  tiny: "Tiny",
  small: "Small",
  medium: "Medium",
  large: "Large",
  huge: "Huge",
  gargantuan: "Gargantuan",
};

export const THREAT_LEVEL_LABELS: Record<ThreatLevel, string> = {
  trivial: "Trivial",
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
  deadly: "Deadly",
  legendary: "Legendary",
};

export const RESISTANCE_LEVEL_LABELS: Record<ResistanceLevel, string> = {
  vulnerable: "Vulnerable",
  resistant: "Resistant",
  immune: "Immune",
};

export const CONDITIONS = [
  "blinded",
  "charmed",
  "deafened",
  "exhaustion",
  "frightened",
  "grappled",
  "incapacitated",
  "invisible",
  "paralyzed",
  "petrified",
  "poisoned",
  "prone",
  "restrained",
  "stunned",
  "unconscious",
] as const;

export const COMMON_LANGUAGES = [
  "Common",
  "Dwarvish",
  "Elvish",
  "Giant",
  "Gnomish",
  "Goblin",
  "Halfling",
  "Orc",
  "Abyssal",
  "Celestial",
  "Draconic",
  "Deep Speech",
  "Infernal",
  "Primordial",
  "Sylvan",
  "Undercommon",
] as const;

export const COMMON_HABITATS = [
  "Arctic",
  "Coastal",
  "Desert",
  "Forest",
  "Grassland",
  "Hill",
  "Mountain",
  "Swamp",
  "Underdark",
  "Underwater",
  "Urban",
] as const;

export const CR_TO_XP: Record<number, number> = {
  0: 10,
  0.125: 25,
  0.25: 50,
  0.5: 100,
  1: 200,
  2: 450,
  3: 700,
  4: 1100,
  5: 1800,
  6: 2300,
  7: 2900,
  8: 3900,
  9: 5000,
  10: 5900,
  11: 7200,
  12: 8400,
  13: 10000,
  14: 11500,
  15: 13000,
  16: 15000,
  17: 18000,
  18: 20000,
  19: 22000,
  20: 25000,
  21: 33000,
  22: 41000,
  23: 50000,
  24: 62000,
  25: 75000,
  26: 90000,
  27: 105000,
  28: 120000,
  29: 135000,
  30: 155000,
};

export const CR_OPTIONS = [
  0, 0.125, 0.25, 0.5, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
  17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
] as const;

export const ALLOWED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif"];

export const TIMING = {
  /** Debounce delay for search input (ms) */
  SEARCH_DEBOUNCE: 300,
  /** Debounce delay for rapid context switching (ms) */
  CONTEXT_SWITCH_DEBOUNCE: 50,
  /** Animation duration for mode transitions (ms) */
  MODE_TRANSITION: 200,
  /** Toast notification display duration (ms) */
  TOAST_DURATION: 5000,
  /** Cache cleanup interval (ms) */
  CACHE_CLEANUP_INTERVAL: 60 * 1000,
} as const;

export const CACHE = {
  /** Maximum number of entries in the API cache */
  MAX_SIZE: 500,
  /** TTL for search results cache (ms) */
  SEARCH_TTL: 2 * 60 * 1000,
  /** TTL for detail views cache (ms) */
  DETAILS_TTL: 5 * 60 * 1000,
  /** TTL for enum data cache (ms) */
  ENUMS_TTL: 30 * 60 * 1000,
} as const;

export const IMAGE = {
  /** Maximum image dimension before resizing (px) */
  MAX_DIMENSION: 2560,
  /** Absolute maximum dimension browsers can handle (px) */
  MAX_SAFE_DIMENSION: 16384,
  /** JPEG compression quality (0-1) */
  JPEG_QUALITY: 0.85,
  /** Maximum canvas area to prevent memory exhaustion */
  MAX_CANVAS_AREA: 16384 * 16384,
  /** Timeout for image optimization operations (ms) */
  OPTIMIZATION_TIMEOUT: 10000,
} as const;

export const RETRY = {
  /** Maximum retry attempts before giving up */
  MAX_ATTEMPTS: 5,
  /** Initial backoff delay (ms) */
  INITIAL_BACKOFF: 1000,
  /** Maximum backoff delay (ms) */
  MAX_BACKOFF: 30000,
} as const;
