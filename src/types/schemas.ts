import { z } from "zod";
import { isValidDiceFormula } from "@/lib/dnd";
import { MAGIC_SCHOOLS, REST_TYPES } from "@/lib/dnd/constants";

export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;
import type {
  AbilityCategory,
  AbilityEffect,
  AbilityTiming,
  AoeShape,
  Attribute,
  DamageType,
  EntityExport,
  EntitySize,
  ItemExport,
  ItemType,
  Rarity,
  ResistanceLevel,
  StackingBehavior,
  StatusExport,
  ThreatLevel,
} from "./generated";


// Type-safe enum values matching generated types
const ITEM_TYPES: [ItemType, ...ItemType[]] = ["weapon", "armor", "consumable", "trinket", "material", "organic", "tool"];
const RARITIES: [Rarity, ...Rarity[]] = ["common", "uncommon", "rare", "veryRare", "legendary", "mythic", "unique"];
const ABILITY_TIMINGS: [AbilityTiming, ...AbilityTiming[]] = ["action", "bonusAction", "reaction", "passive", "legendary", "mythic", "lair"];
const ABILITY_CATEGORIES: [AbilityCategory, ...AbilityCategory[]] = ["none", "multiattack", "regionalEffect"];
const AOE_SHAPES: [AoeShape, ...AoeShape[]] = ["sphere", "cube", "cone", "line", "cylinder"];
const DAMAGE_TYPES: [DamageType, ...DamageType[]] = ["acid", "bludgeoning", "cold", "fire", "force", "lightning", "necrotic", "piercing", "poison", "psychic", "radiant", "slashing", "thunder"];
const ENTITY_SIZES: [EntitySize, ...EntitySize[]] = ["tiny", "small", "medium", "large", "huge", "gargantuan"];
const THREAT_LEVELS: [ThreatLevel, ...ThreatLevel[]] = ["trivial", "easy", "medium", "hard", "deadly", "legendary"];
const ATTRIBUTES: [Attribute, ...Attribute[]] = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"];
const RESISTANCE_LEVELS: [ResistanceLevel, ...ResistanceLevel[]] = ["vulnerable", "resistant", "immune"];
const STACKING_BEHAVIORS: [StackingBehavior, ...StackingBehavior[]] = ["no", "refresh", "stack"];


const nullableNumber = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((val) => {
    if (val === "" || val == null) return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
  });

const nullableString = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((val) => (val === "" || val == null ? null : val));

/**
 * Parses JSON string to object, or returns empty object for null/undefined.
 * Includes security validations to prevent prototype pollution and
 * excessive nesting that could cause DoS.
 */
const MAX_JSON_DEPTH = 5;
const MAX_JSON_KEYS = 50;

function validateJsonValue(obj: unknown, depth = 0): boolean {
  if (depth > MAX_JSON_DEPTH) return false;
  if (obj === null || obj === undefined) return true;
  if (typeof obj !== "object") return true;
  if (Array.isArray(obj)) {
    return obj.length <= MAX_JSON_KEYS && obj.every(item => validateJsonValue(item, depth + 1));
  }
  const keys = Object.keys(obj);
  if (keys.length > MAX_JSON_KEYS) return false;
  // Prevent prototype pollution attacks
  const dangerousKeys = ["__proto__", "constructor", "prototype"];
  if (keys.some(k => dangerousKeys.includes(k))) return false;
  return keys.every(k => validateJsonValue((obj as Record<string, unknown>)[k], depth + 1));
}

function isPlainJsonObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

const jsonObject: z.ZodType<Record<string, unknown>> = z
  .union([z.string(), z.record(z.string(), z.unknown()), z.null(), z.undefined()])
  .transform((val) => {
    if (typeof val === "string" && val.trim()) {
      try {
        const parsed: unknown = JSON.parse(val);
        return isPlainJsonObject(parsed) ? parsed : {};
      } catch {
        return {};
      }
    }
    return isPlainJsonObject(val) ? val : {};
  })
  .refine(validateJsonValue, {
    message: "Invalid custom data: contains forbidden keys or is too deeply nested"
  })
  .transform((val) => {
    // Ensure we always return a plain object, stripping any prototype chain
    return Object.fromEntries(Object.entries(val));
  });

const stringArray = z
  .union([z.string(), z.array(z.string()), z.null(), z.undefined()])
  .transform((val) => {
    if (typeof val === "string") {
      return val.split(",").map((s) => s.trim()).filter(Boolean);
    }
    return Array.isArray(val) ? val : [];
  });

const numberRecord = z
  .union([z.record(z.string(), z.unknown()), z.null(), z.undefined()])
  .transform((val) => {
    if (!val || typeof val !== "object") return {};
    const result: Record<string, number> = {};
    for (const [key, value] of Object.entries(val)) {
      if (value === "" || value == null) continue;
      const num = Number(value);
      if (!isNaN(num)) result[key] = num;
    }
    return result;
  });


const statValueSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("flat"), value: z.number() }),
  z.object({ type: z.literal("percentAdd"), value: z.number() }),
  z.object({ type: z.literal("percentMult"), value: z.number() }),
]);

const savingThrowSchema = z.object({
  dc: z.number().int().positive(),
  attribute: z.enum(ATTRIBUTES),
});

const durabilitySchema = z
  .object({
    current: z.number().int().nonnegative(),
    max: z.number().int().positive(),
  })
  .refine((data) => data.current <= data.max, {
    message: "Current cannot exceed max",
    path: ["current"],
  });

const taxonomySchema = z.object({
  genus: nullableString,
  species: nullableString,
  subspecies: nullableString,
});

// Helper: Validates that a string is a non-empty valid UUID
// Provides clear error messages for unselected (empty) vs invalid values
const requiredUuid = (fieldName: string) =>
  z.string()
    .min(1, `${fieldName} is required`)
    .pipe(z.uuid({ message: `${fieldName} must be a valid selection` }));

// `.default(null)` so payloads omitting a field parse instead of rejecting.
const statBlockSchema = z.object({
  hp: nullableNumber.pipe(z.number().int().positive().nullable()).default(null),
  hitDice: nullableString.default(null),
  armor: nullableNumber.pipe(z.number().int().nonnegative().nullable()).default(null),
  armorNote: nullableString.default(null),
  speed: nullableNumber.pipe(z.number().nonnegative().nullable()).default(null),
  burrowSpeed: nullableNumber.pipe(z.number().nonnegative().nullable()).default(null),
  climbSpeed: nullableNumber.pipe(z.number().nonnegative().nullable()).default(null),
  flySpeed: nullableNumber.pipe(z.number().nonnegative().nullable()).default(null),
  swimSpeed: nullableNumber.pipe(z.number().nonnegative().nullable()).default(null),
  hoverSpeed: nullableNumber.pipe(z.number().nonnegative().nullable()).default(null),
  initiativeBonus: nullableNumber.pipe(z.number().int().nullable()).default(null),
  strength: nullableNumber.pipe(z.number().int().min(1).max(30).nullable()).default(null),
  dexterity: nullableNumber.pipe(z.number().int().min(1).max(30).nullable()).default(null),
  constitution: nullableNumber.pipe(z.number().int().min(1).max(30).nullable()).default(null),
  intelligence: nullableNumber.pipe(z.number().int().min(1).max(30).nullable()).default(null),
  wisdom: nullableNumber.pipe(z.number().int().min(1).max(30).nullable()).default(null),
  charisma: nullableNumber.pipe(z.number().int().min(1).max(30).nullable()).default(null),
  // Custom properties can be numbers (speeds) or strings (armor type, ability, etc.)
  custom: z.record(z.string(), z.union([z.number(), z.string()])).default({}),
});

const lootDropSchema = z.object({
  itemId: requiredUuid("Item"),  // Validates non-empty and valid UUID format
  quantity: z.string().min(1, "Quantity is required"),
  dropChance: z.number().min(0, "Drop chance must be at least 0").max(1, "Drop chance cannot exceed 100%"),
});

const damageResistanceSchema = z.object({
  damageType: z.enum(DAMAGE_TYPES),
  level: z.enum(RESISTANCE_LEVELS),
});

const spellComponentsSchema = z.object({
  verbal: z.boolean(),
  somatic: z.boolean(),
  material: nullableString,
});

const abilityTargetSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("selfTarget") }),
  z.object({ type: z.literal("target"), range: z.number().int().nonnegative(), count: z.number().int().positive() }),
  z.object({ type: z.literal("area"), shape: z.enum(AOE_SHAPES), range: z.number().int().nonnegative() }),
]);

const abilityUsesSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("recharge"),
    min: z.number().int().min(1).max(6),
    max: z.number().int().min(1).max(6),
  }).refine(v => v.min <= v.max, {
    message: "recharge: min must be <= max",
    path: ["max"],
  }),
  z.object({
    kind: z.literal("perDay"),
    count: z.number().int().min(1),
  }),
  z.object({
    kind: z.literal("perRest"),
    count: z.number().int().min(1),
    rest: z.enum(REST_TYPES),
  }),
  z.object({ kind: z.literal("atWill") }),
  z.object({ kind: z.literal("once") }),
]);

// lazy() is required because AbilityEffect.areaOfEffect.effects references AbilityEffect itself
const abilityEffectSchema: z.ZodType<AbilityEffect> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.object({ type: z.literal("damage"), formula: z.string().refine(isValidDiceFormula, "Invalid dice formula"), damageType: z.enum(DAMAGE_TYPES) }),
    z.object({ type: z.literal("heal"), formula: z.string().refine(isValidDiceFormula, "Invalid dice formula") }),
    z.object({ type: z.literal("applyStatus"), statusId: requiredUuid("Status"), duration: z.string(), savingThrow: savingThrowSchema.nullable() }),
    z.object({ type: z.literal("modifyStat"), attribute: z.enum(ATTRIBUTES), value: statValueSchema, durationRounds: z.number().int().positive() }),
    z.object({ type: z.literal("summon"), entityId: requiredUuid("Entity"), quantity: z.string() }),
    z.object({ type: z.literal("transform"), targetEntityId: requiredUuid("Target Entity"), duration: z.string(), revertOnDeath: z.boolean() }),
    z.object({ type: z.literal("move"), distance: z.number().int().positive(), direction: z.string() }),
    z.object({ type: z.literal("areaOfEffect"), shape: z.enum(AOE_SHAPES), range: z.number().int().positive(), effects: z.array(abilityEffectSchema) }),
    z.object({ type: z.literal("custom"), description: z.string(), data: jsonObject }),
  ])
);

/** Status effect payload with proper nullable handling */
const statusEffectPayloadSchema = z.object({
  movePenalty: statValueSchema.nullable(),
  attackPenalty: statValueSchema.nullable(),
  defenseBonus: statValueSchema.nullable(),
  durationRounds: nullableNumber.pipe(z.number().int().positive().nullable()),
  durationMinutes: nullableNumber.pipe(z.number().positive().nullable()),
  stacks: z.enum(STACKING_BEHAVIORS).default("no"),
  tags: stringArray.default([]),
  custom: jsonObject.default({}),
});


const baseSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1, "Name is required."),
  createdAt: z.string(),
  updatedAt: z.string(),
});


const nullableHexColor = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((val) => (val === "" || val == null ? null : val))
  .pipe(z.string().regex(HEX_COLOR_REGEX, "Must be a valid hex color.").nullable());

export const statusSchema = baseSchema.extend({
  shortTag: z.string().min(1, "Short tag is required.").regex(SLUG_REGEX, "Short tag must be a valid slug."),
  icon: z.string().min(1, "An icon must be selected."),
  color: nullableHexColor,
  summary: z.string().min(1, "Summary is required."),
  description: z.string().default(""),
  payload: statusEffectPayloadSchema,
}) satisfies z.ZodType<StatusExport>;

export const itemSchema = baseSchema.extend({
  slug: z.string().regex(SLUG_REGEX, "Slug must be a valid slug format."),
  type: z.enum(ITEM_TYPES),
  description: z.string().default(""),
  icon: z.string().min(1, "An icon must be selected."),
  weight: nullableNumber.pipe(z.number().nonnegative().nullable()),
  bulk: nullableNumber.pipe(z.number().nonnegative().nullable()),
  rarity: z.enum(RARITIES).nullable(),
  properties: jsonObject.default({}),
  equipSlots: stringArray.default([]),
  statModifiers: z.record(z.string(), statValueSchema).default({}),
  durability: durabilitySchema.nullable(),
}) satisfies z.ZodType<ItemExport>;

// No `satisfies` check; recursive abilityEffectSchema typing prevents it
export const abilitySchema = baseSchema.extend({
  slug: z.string().regex(SLUG_REGEX, "Slug must be a valid slug format."),
  description: z.string().default(""),
  timing: z.enum(ABILITY_TIMINGS),
  category: z.enum(ABILITY_CATEGORIES).default("none"),
  target: abilityTargetSchema.nullable(),
  requiresConcentration: z.boolean().default(false),
  components: spellComponentsSchema.nullable(),
  spellLevel: z.number().int().min(0).max(9).nullable().default(null),
  school: z.enum(MAGIC_SCHOOLS).nullable().default(null),
  ritual: z.boolean().default(false),
  higherLevels: nullableString,
  uses: abilityUsesSchema.nullable().default(null),
  effects: z.array(abilityEffectSchema).default([]),
}).superRefine((v, ctx) => {
  if (v.category !== "none") {
    if (v.spellLevel != null) {
      ctx.addIssue({ code: "custom", message: "spellLevel requires category='none'", path: ["spellLevel"] });
    }
    if (v.school != null) {
      ctx.addIssue({ code: "custom", message: "school requires category='none'", path: ["school"] });
    }
    if (v.ritual) {
      ctx.addIssue({ code: "custom", message: "ritual requires category='none'", path: ["ritual"] });
    }
    if (v.higherLevels != null) {
      ctx.addIssue({ code: "custom", message: "higherLevels requires category='none'", path: ["higherLevels"] });
    }
    if (v.components != null) {
      ctx.addIssue({ code: "custom", message: `components not allowed on category='${v.category}'`, path: ["components"] });
    }
    if (v.target != null) {
      ctx.addIssue({ code: "custom", message: `target not allowed on category='${v.category}'`, path: ["target"] });
    }
    if (v.requiresConcentration) {
      ctx.addIssue({ code: "custom", message: `requiresConcentration not allowed on category='${v.category}'`, path: ["requiresConcentration"] });
    }
    if (v.uses != null) {
      ctx.addIssue({ code: "custom", message: `uses not allowed on category='${v.category}'`, path: ["uses"] });
    }
  }
  if (v.category === "multiattack" && v.effects.length > 0) {
    ctx.addIssue({ code: "custom", message: "multiattack should have no effects; author constituent attacks as separate abilities", path: ["effects"] });
  }
});

export const entitySchema = baseSchema.extend({
  slug: z.string().regex(SLUG_REGEX, "Slug must be a valid slug format."),
  taxonomy: taxonomySchema.default({ genus: null, species: null, subspecies: null }),
  size: z.enum(ENTITY_SIZES).nullable(),
  threatLevel: z.enum(THREAT_LEVELS).nullable(),
  alignment: nullableString,
  challengeRating: nullableNumber.pipe(z.number().min(0).nullable()),
  experiencePoints: nullableNumber.pipe(z.number().int().nonnegative().nullable()),
  proficiencyBonus: nullableNumber.pipe(z.number().int().nonnegative().nullable()),
  legendaryActionsPerRound: nullableNumber.pipe(z.number().int().positive().nullable()),
  savingThrows: numberRecord.default({}),
  skills: numberRecord.default({}),
  damageResistances: z.array(damageResistanceSchema).default([]),
  statusImmunities: z.array(z.uuid()).default([]),
  senses: z.array(z.string()).default([]),
  languages: z.array(z.string()).default([]),
  statBlock: statBlockSchema.default({
    hp: null, hitDice: null, armor: null, armorNote: null,
    speed: null, burrowSpeed: null, climbSpeed: null, flySpeed: null,
    swimSpeed: null, hoverSpeed: null, initiativeBonus: null,
    strength: null, dexterity: null, constitution: null,
    intelligence: null, wisdom: null, charisma: null,
    custom: {},
  }),
  habitats: z.array(z.string()).default([]),
  description: z.string().default(""),
  notes: z.string().default(""),
  statusIds: z.array(z.uuid()).default([]),
  abilityIds: z.array(z.uuid()).default([]),
  inventory: z.array(lootDropSchema).default([]),
  images: z.array(z.string()).default([]),
}) satisfies z.ZodType<EntityExport>;


export type StatusFormData = z.infer<typeof statusSchema>;
export type ItemFormData = z.infer<typeof itemSchema>;
export type AbilityFormData = z.infer<typeof abilitySchema>;
export type EntityFormData = z.infer<typeof entitySchema>;
