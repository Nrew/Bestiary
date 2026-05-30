import { describe, expect, it } from "vitest";
import { abilitySchema, entitySchema, itemSchema, statusSchema } from "./schemas";

const id = "00000000-0000-4000-8000-000000000001";
const base = {
  id,
  name: "Test",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

describe("schema JSON object coercion", () => {
  it("rejects parsed arrays and primitives for item property records", () => {
    expect(itemSchema.parse({
      ...base,
      slug: "test-item",
      type: "tool",
      description: "",
      icon: "entity/tool",
      weight: null,
      bulk: null,
      rarity: null,
      properties: "[1,2,3]",
      equipSlots: [],
      statModifiers: {},
      durability: null,
    }).properties).toEqual({});
  });

  it("keeps parsed plain objects for custom ability effects", () => {
    const parsed = abilitySchema.parse({
      ...base,
      slug: "test-ability",
      description: "",
      timing: "action",
      category: "none",
      target: null,
      requiresConcentration: false,
      components: null,
      effects: [{ type: "custom", description: "custom", data: "{\"dc\":15}" }],
    });

    expect(parsed.effects[0]).toEqual({
      type: "custom",
      description: "custom",
      data: { dc: 15 },
    });
  });

  // Guard for Phase 1 of the form-mount refactor: FormInput is being changed
  // from a Controller-wrapped input to a bare register() call. Both paths
  // must pass the raw string (e.g. "" or "13") to RHF; coercion happens here
  // in the schema. If a future change to FormInput introduces valueAsNumber
  // or a setValueAs that pre-coerces to NaN, this contract breaks silently.
  it("coerces empty/numeric strings on statBlock leaves to null/number", () => {
    const parsed = entitySchema.parse({
      ...base,
      slug: "test-entity",
      size: null,
      threatLevel: null,
      alignment: null,
      challengeRating: null,
      experiencePoints: null,
      proficiencyBonus: null,
      legendaryActionsPerRound: null,
      statBlock: {
        hp: "",
        hitDice: null,
        armor: "13",
        armorNote: null,
        speed: null,
        burrowSpeed: null,
        climbSpeed: null,
        flySpeed: "",
        swimSpeed: "30",
        hoverSpeed: null,
        initiativeBonus: "2",
        strength: "18",
        dexterity: "",
        constitution: "10",
        intelligence: "12",
        wisdom: "",
        charisma: "8",
        custom: {},
      },
    });
    expect(parsed.statBlock.hp).toBeNull();
    expect(parsed.statBlock.armor).toBe(13);
    expect(parsed.statBlock.initiativeBonus).toBe(2);
    expect(parsed.statBlock.strength).toBe(18);
    expect(parsed.statBlock.dexterity).toBeNull();
    expect(parsed.statBlock.constitution).toBe(10);
    expect(parsed.statBlock.intelligence).toBe(12);
    expect(parsed.statBlock.wisdom).toBeNull();
    expect(parsed.statBlock.charisma).toBe(8);
    expect(parsed.statBlock.swimSpeed).toBe(30);
    expect(parsed.statBlock.flySpeed).toBeNull();
  });

  it("treats whitespace-only numeric strings as null, not 0", () => {
    const parsed = entitySchema.parse({
      ...base,
      slug: "test-entity",
      size: null,
      threatLevel: null,
      alignment: null,
      challengeRating: null,
      experiencePoints: null,
      proficiencyBonus: null,
      legendaryActionsPerRound: null,
      statBlock: {
        hp: "  ",
        hitDice: null,
        armor: " ",
        armorNote: null,
        speed: null,
        burrowSpeed: null,
        climbSpeed: null,
        flySpeed: null,
        swimSpeed: null,
        hoverSpeed: null,
        initiativeBonus: null,
        strength: null,
        dexterity: null,
        constitution: null,
        intelligence: null,
        wisdom: null,
        charisma: null,
        custom: {},
      },
    });
    expect(parsed.statBlock.hp).toBeNull();
    expect(parsed.statBlock.armor).toBeNull();
  });

  it("rejects prototype-polluting custom status keys", () => {
    const result = statusSchema.safeParse({
      ...base,
      shortTag: "test-status",
      icon: "condition/stunned",
      color: null,
      summary: "Test status",
      description: "",
      payload: {
        movePenalty: null,
        attackPenalty: null,
        defenseBonus: null,
        durationRounds: null,
        durationMinutes: null,
        stacks: "no",
        tags: [],
        custom: { constructor: "bad" },
      },
    });

    expect(result.success).toBe(false);
  });
});

describe("abilitySchema spell fields", () => {
  const baseSpell = {
    id: "00000000-0000-4000-8000-000000000002",
    name: "Fireball", slug: "fireball", description: "",
    timing: "action" as const,
    category: "none" as const,
    target: null,
    requiresConcentration: false, components: null,
    effects: [],
    createdAt: "2026-05-14T00:00:00Z",
    updatedAt: "2026-05-14T00:00:00Z",
  };

  it("accepts an action-timing spell with level/school/ritual/higherLevels", () => {
    const r = abilitySchema.safeParse({
      ...baseSpell, spellLevel: 3, school: "evocation",
      ritual: false, higherLevels: "+1d6 per slot",
    });
    expect(r.success).toBe(true);
  });
  it("accepts a reaction-timing spell (e.g., Counterspell, Shield)", () => {
    const r = abilitySchema.safeParse({
      ...baseSpell, timing: "reaction", spellLevel: 3, school: "abjuration",
    });
    expect(r.success).toBe(true);
  });
  it("accepts a bonusAction-timing spell (e.g., Healing Word)", () => {
    const r = abilitySchema.safeParse({
      ...baseSpell, timing: "bonusAction", spellLevel: 1, school: "evocation",
    });
    expect(r.success).toBe(true);
  });
  it("rejects spellLevel > 9", () => {
    const r = abilitySchema.safeParse({ ...baseSpell, spellLevel: 10 });
    expect(r.success).toBe(false);
  });
  it("rejects spellLevel < 0", () => {
    const r = abilitySchema.safeParse({ ...baseSpell, spellLevel: -1 });
    expect(r.success).toBe(false);
  });
  it("accepts spellLevel 0 (cantrip)", () => {
    const r = abilitySchema.safeParse({ ...baseSpell, spellLevel: 0 });
    expect(r.success).toBe(true);
  });
  it("rejects ritual=true on category=multiattack", () => {
    const r = abilitySchema.safeParse({
      ...baseSpell, category: "multiattack", ritual: true,
    });
    expect(r.success).toBe(false);
  });
  it("rejects school on category=multiattack", () => {
    const r = abilitySchema.safeParse({
      ...baseSpell, category: "multiattack", school: "evocation",
    });
    expect(r.success).toBe(false);
  });
  it("rejects higherLevels on category=regionalEffect", () => {
    const r = abilitySchema.safeParse({
      ...baseSpell, timing: "passive", category: "regionalEffect", higherLevels: "anything",
    });
    expect(r.success).toBe(false);
  });
  it("rejects spellLevel on category=multiattack", () => {
    const r = abilitySchema.safeParse({
      ...baseSpell, category: "multiattack", spellLevel: 3,
    });
    expect(r.success).toBe(false);
  });
});

describe("abilitySchema uses field", () => {
  const base = {
    id: "00000000-0000-4000-8000-000000000003",
    name: "X", slug: "x", description: "",
    timing: "action" as const,
    category: "none" as const,
    target: null,
    requiresConcentration: false, components: null,
    effects: [],
    createdAt: "2026-05-14T00:00:00Z",
    updatedAt: "2026-05-14T00:00:00Z",
  };

  it("accepts recharge 5-6", () => {
    const r = abilitySchema.safeParse({
      ...base, uses: { kind: "recharge", min: 5, max: 6 },
    });
    expect(r.success).toBe(true);
  });
  it("rejects recharge with min > max", () => {
    const r = abilitySchema.safeParse({
      ...base, uses: { kind: "recharge", min: 7, max: 6 },
    });
    expect(r.success).toBe(false);
  });
  it("rejects perDay count 0", () => {
    const r = abilitySchema.safeParse({
      ...base, uses: { kind: "perDay", count: 0 },
    });
    expect(r.success).toBe(false);
  });
  it("accepts atWill and once with no extra fields", () => {
    for (const u of [{ kind: "atWill" }, { kind: "once" }] as const) {
      const r = abilitySchema.safeParse({ ...base, uses: u });
      expect(r.success).toBe(true);
    }
  });
  it("accepts perRest with valid count and rest type", () => {
    const r = abilitySchema.safeParse({
      ...base, uses: { kind: "perRest", count: 2, rest: "long" },
    });
    expect(r.success).toBe(true);
  });
});

describe("abilitySchema refine paths", () => {
  const baseAction = {
    id: "00000000-0000-4000-8000-000000000004",
    name: "Bite", slug: "bite", description: "",
    timing: "action" as const,
    category: "none" as const,
    target: null,
    requiresConcentration: false, components: null,
    spellLevel: null, school: null, ritual: false, higherLevels: null,
    uses: null, effects: [],
    createdAt: "2026-05-14T00:00:00Z",
    updatedAt: "2026-05-14T00:00:00Z",
  };

  it("accepts a plain action ability with all spell fields null/false", () => {
    const r = abilitySchema.safeParse(baseAction);
    expect(r.success).toBe(true);
  });

  it("attaches refine error to spellLevel path on multiattack+spellLevel", () => {
    const r = abilitySchema.safeParse({ ...baseAction, category: "multiattack", spellLevel: 3 });
    expect(r.success).toBe(false);
    if (!r.success) {
      const paths = r.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("spellLevel");
    }
  });

  it("attaches refine error to school path on multiattack+school", () => {
    const r = abilitySchema.safeParse({ ...baseAction, category: "multiattack", school: "evocation" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const paths = r.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("school");
    }
  });

  it("attaches refine error to ritual path on multiattack+ritual=true", () => {
    const r = abilitySchema.safeParse({ ...baseAction, category: "multiattack", ritual: true });
    expect(r.success).toBe(false);
    if (!r.success) {
      const paths = r.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("ritual");
    }
  });

  it("attaches refine error to higherLevels path on multiattack+higherLevels", () => {
    const r = abilitySchema.safeParse({ ...baseAction, category: "multiattack", higherLevels: "anything" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const paths = r.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("higherLevels");
    }
  });

  it("emits one issue per violating spell-only field", () => {
    const r = abilitySchema.safeParse({
      ...baseAction,
      category: "multiattack",
      spellLevel: 3, school: "evocation", ritual: true, higherLevels: "x",
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const paths = new Set(r.error.issues.map((i) => i.path.join(".")));
      expect(paths.has("spellLevel")).toBe(true);
      expect(paths.has("school")).toBe(true);
      expect(paths.has("ritual")).toBe(true);
      expect(paths.has("higherLevels")).toBe(true);
    }
  });

  it("accepts an action ability with uses and all spell fields populated", () => {
    const r = abilitySchema.safeParse({
      ...baseAction,
      spellLevel: 3, school: "evocation", ritual: false, higherLevels: "+1d6 per slot",
      uses: { kind: "perDay", count: 1 },
    });
    expect(r.success).toBe(true);
  });
});

describe("abilityUsesSchema discriminator and bounds", () => {
  const base = {
    id: "00000000-0000-4000-8000-000000000005",
    name: "X", slug: "x", description: "",
    timing: "action" as const,
    category: "none" as const,
    target: null,
    requiresConcentration: false, components: null,
    spellLevel: null, school: null, ritual: false, higherLevels: null,
    effects: [],
    createdAt: "2026-05-14T00:00:00Z",
    updatedAt: "2026-05-14T00:00:00Z",
  };

  it("rejects perRest with invalid rest type", () => {
    const r = abilitySchema.safeParse({
      ...base, uses: { kind: "perRest", count: 1, rest: "midnight" },
    });
    expect(r.success).toBe(false);
  });

  it("rejects unknown uses discriminator", () => {
    const r = abilitySchema.safeParse({
      ...base, uses: { kind: "perWeek", count: 1 },
    });
    expect(r.success).toBe(false);
  });

  it("rejects uses object missing kind", () => {
    const r = abilitySchema.safeParse({
      ...base, uses: { count: 1 },
    });
    expect(r.success).toBe(false);
  });

  it("rejects recharge with min=0 (below bound)", () => {
    const r = abilitySchema.safeParse({
      ...base, uses: { kind: "recharge", min: 0, max: 6 },
    });
    expect(r.success).toBe(false);
  });

  it("rejects recharge with max=7 (above bound)", () => {
    const r = abilitySchema.safeParse({
      ...base, uses: { kind: "recharge", min: 5, max: 7 },
    });
    expect(r.success).toBe(false);
  });

  it("accepts perRest with each valid rest type", () => {
    for (const rest of ["short", "long", "dawn"] as const) {
      const r = abilitySchema.safeParse({
        ...base, uses: { kind: "perRest", count: 1, rest },
      });
      expect(r.success).toBe(true);
    }
  });
});

describe("abilitySchema symmetric constraints for multiattack/regionalEffect", () => {
  const base = {
    id: "00000000-0000-4000-8000-000000000006",
    name: "X", slug: "x", description: "",
    timing: "action" as const,
    target: null,
    requiresConcentration: false, components: null,
    spellLevel: null, school: null, ritual: false, higherLevels: null,
    uses: null, effects: [],
    createdAt: "2026-05-14T00:00:00Z",
    updatedAt: "2026-05-14T00:00:00Z",
  };

  it("accepts multiattack with no target / concentration / uses / effects", () => {
    const r = abilitySchema.safeParse({ ...base, category: "multiattack" });
    expect(r.success).toBe(true);
  });

  it("accepts regionalEffect with no target / concentration / uses", () => {
    const r = abilitySchema.safeParse({ ...base, timing: "passive", category: "regionalEffect" });
    expect(r.success).toBe(true);
  });

  it("rejects multiattack with a target, on target path", () => {
    const r = abilitySchema.safeParse({
      ...base, category: "multiattack",
      target: { type: "target", range: 30, count: 1 },
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.map(i => i.path.join("."))).toContain("target");
    }
  });

  it("rejects regionalEffect with a target, on target path", () => {
    const r = abilitySchema.safeParse({
      ...base, timing: "passive", category: "regionalEffect",
      target: { type: "area", shape: "sphere", range: 60 },
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.map(i => i.path.join("."))).toContain("target");
    }
  });

  it("rejects multiattack with requiresConcentration=true", () => {
    const r = abilitySchema.safeParse({
      ...base, category: "multiattack", requiresConcentration: true,
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.map(i => i.path.join("."))).toContain("requiresConcentration");
    }
  });

  it("rejects regionalEffect with uses set", () => {
    const r = abilitySchema.safeParse({
      ...base, timing: "passive", category: "regionalEffect",
      uses: { kind: "perDay", count: 1 },
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.map(i => i.path.join("."))).toContain("uses");
    }
  });

  it("rejects multiattack with non-empty effects on effects path", () => {
    const r = abilitySchema.safeParse({
      ...base, category: "multiattack",
      effects: [{ type: "custom", description: "x", data: {} }],
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.map(i => i.path.join("."))).toContain("effects");
    }
  });

  it("rejects multiattack with components on components path", () => {
    const r = abilitySchema.safeParse({
      ...base, category: "multiattack",
      components: { verbal: true, somatic: false, material: null },
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.map(i => i.path.join("."))).toContain("components");
    }
  });
});
