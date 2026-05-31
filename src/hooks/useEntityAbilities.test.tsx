import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import type { Ability, AbilityCategory, AbilityTiming, Entity } from "@/types";

function makeAbility(id: string, timing: AbilityTiming, category: AbilityCategory = "none"): Ability {
  return {
    id,
    name: `Ability ${id}`,
    slug: `ability-${id}`,
    description: "",
    timing,
    category,
    target: null,
    requiresConcentration: false,
    components: null,
    spellLevel: null,
    school: null,
    ritual: false,
    higherLevels: null,
    uses: null,
    effects: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function makeEntity(abilityIds: string[]): Entity {
  return {
    id: "entity-1",
    name: "Test Entity",
    slug: "test-entity",
    taxonomy: { genus: "monster", species: null, subspecies: null },
    size: null,
    threatLevel: null,
    alignment: null,
    challengeRating: null,
    experiencePoints: null,
    proficiencyBonus: null,
    legendaryActionsPerRound: null,
    savingThrows: {},
    skills: {},
    damageResistances: [],
    statusImmunities: [],
    senses: [],
    languages: [],
    habitats: [],
    description: "",
    statBlock: {
      hp: 1, hitDice: "1d8", armor: 10, armorNote: null,
      speed: 30, burrowSpeed: null, climbSpeed: null, flySpeed: null,
      swimSpeed: null, hoverSpeed: null, initiativeBonus: null,
      strength: 10, dexterity: 10, constitution: 10,
      intelligence: 10, wisdom: 10, charisma: 10,
      custom: {},
    },
    notes: "",
    statusIds: [],
    abilityIds,
    inventory: [],
    images: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

const mockEntries: Ability[] = [];

vi.mock("@/store/appStore", () => ({
  useAbilitiesMap: () => new Map<string, Ability>(),
  useAppStore: () => async () => {},
}));

vi.mock("@/hooks/useLoadedReferences", () => ({
  useLoadedReferences: () => ({
    entries: mockEntries,
    missingIds: [],
    loading: false,
    error: null,
  }),
}));

const { useEntityAbilities } = await import("./useEntityAbilities");

type Result = ReturnType<typeof useEntityAbilities>;

function probe(entity: Entity): Result {
  let captured: Result | null = null;
  const Probe: React.FC = () => {
    captured = useEntityAbilities(entity);
    return null;
  };
  renderToStaticMarkup(React.createElement(Probe));
  if (!captured) throw new Error("Probe did not render");
  return captured;
}

describe("useEntityAbilities — timing + category grouping", () => {
  it("groups action-timing standard abilities into the actions bucket", () => {
    mockEntries.length = 0;
    mockEntries.push(makeAbility("a1", "action"));
    const result = probe(makeEntity(["a1"]));
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].id).toBe("a1");
  });

  it("groups spells under their timing bucket (a reaction spell under reactions)", () => {
    mockEntries.length = 0;
    const reactionSpell = makeAbility("s1", "reaction");
    reactionSpell.spellLevel = 3;
    reactionSpell.school = "abjuration";
    mockEntries.push(reactionSpell);
    const result = probe(makeEntity(["s1"]));
    expect(result.reactions).toHaveLength(1);
    expect(result.reactions[0].id).toBe("s1");
    expect(result.actions).toHaveLength(0);
  });

  it("groups multiattack abilities into the multiattacks bucket regardless of timing", () => {
    mockEntries.length = 0;
    mockEntries.push(makeAbility("m1", "action", "multiattack"));
    const result = probe(makeEntity(["m1"]));
    expect(result.multiattacks).toHaveLength(1);
    expect(result.multiattacks[0].id).toBe("m1");
    expect(result.actions).toHaveLength(0);
  });

  it("groups regionalEffect abilities into the regionalEffects bucket", () => {
    mockEntries.length = 0;
    mockEntries.push(makeAbility("r1", "passive", "regionalEffect"));
    const result = probe(makeEntity(["r1"]));
    expect(result.regionalEffects).toHaveLength(1);
    expect(result.regionalEffects[0].id).toBe("r1");
    expect(result.traits).toHaveLength(0);
  });

  it("classifies all three category groups together alongside timing buckets", () => {
    mockEntries.length = 0;
    mockEntries.push(
      makeAbility("a1", "action"),
      makeAbility("m1", "action", "multiattack"),
      makeAbility("r1", "passive", "regionalEffect"),
      makeAbility("t1", "passive"),
    );
    const result = probe(makeEntity(["a1", "m1", "r1", "t1"]));
    expect(result.actions).toHaveLength(1);
    expect(result.multiattacks).toHaveLength(1);
    expect(result.regionalEffects).toHaveLength(1);
    expect(result.traits).toHaveLength(1);
  });
});
