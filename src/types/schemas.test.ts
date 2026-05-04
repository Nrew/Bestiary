import { describe, expect, it } from "vitest";
import { abilitySchema, itemSchema, statusSchema } from "./schemas";

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
