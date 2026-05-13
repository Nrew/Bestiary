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
      type: "action",
      target: null,
      castingTime: null,
      requiresConcentration: false,
      components: null,
      recharge: null,
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
