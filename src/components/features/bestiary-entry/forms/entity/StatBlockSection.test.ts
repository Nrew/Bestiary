import { describe, expect, it } from "vitest";
import { migrateLegacyCustomStats } from "./StatBlockSection";
import type { Entity } from "@/types";

const createStatBlock = (
  custom: Record<string, string | number>,
  overrides: Partial<Entity["statBlock"]> = {}
): Entity["statBlock"] => ({
  hp: null,
  hitDice: null,
  armor: null,
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
  custom,
  ...overrides,
});

describe("migrateLegacyCustomStats", () => {
  it("moves parseable legacy custom stats into structured fields", () => {
    const result = migrateLegacyCustomStats(
      createStatBlock({
        climbSpeed: "20",
        hitDice: "8d10 + 40",
        SpellPower: 15,
      })
    );

    expect(result.changed).toBe(true);
    expect(result.updates).toEqual({
      climbSpeed: 20,
      hitDice: "8d10 + 40",
    });
    expect(result.custom).toEqual({ SpellPower: 15 });
  });

  it("keeps unparseable legacy numeric values in custom stats", () => {
    const result = migrateLegacyCustomStats(
      createStatBlock({
        flySpeed: "30 ft. hover",
      })
    );

    expect(result.changed).toBe(false);
    expect(result.updates).toEqual({});
    expect(result.custom).toEqual({ flySpeed: "30 ft. hover" });
  });

  it("drops duplicate legacy keys when the structured value already exists", () => {
    const result = migrateLegacyCustomStats(
      createStatBlock(
        {
          armorType: "natural armor",
          SpellPower: 15,
        },
        { armorNote: "natural armor" }
      )
    );

    expect(result.changed).toBe(true);
    expect(result.updates).toEqual({});
    expect(result.custom).toEqual({ SpellPower: 15 });
  });
});
