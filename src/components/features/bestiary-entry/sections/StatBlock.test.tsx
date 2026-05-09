import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Entity } from "@/types";

vi.mock("@/store/appStore", () => ({
  useStatusesMap: () => new Map(),
}));

vi.mock("@/components/shared/EntityLink", () => ({
  EntityLink: ({ value }: { value: string | number }) => <span>{value}</span>,
}));

vi.mock("@/components/shared", () => ({
  Icon: () => null,
}));

vi.mock("@/lib/api", () => ({
  statusApi: {
    getDetails: vi.fn(),
  },
}));

const { StatBlockSection } = await import("./StatBlock");

const createEntity = (overrides: Partial<Entity> = {}): Entity => ({
  id: "550e8400-e29b-41d4-a716-446655440000",
  name: "Climber",
  slug: "climber",
  taxonomy: {
    genus: null,
    species: null,
    subspecies: null,
  },
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
    custom: {
      SpellPower: 15,
    },
  },
  notes: "",
  statusIds: [],
  abilityIds: [],
  inventory: [],
  images: [],
  createdAt: "2026-05-09T00:00:00.000Z",
  updatedAt: "2026-05-09T00:00:00.000Z",
  ...overrides,
});

describe("StatBlockSection", () => {
  it("splits camelCase custom stat keys into spaced labels", () => {
    const markup = renderToStaticMarkup(<StatBlockSection data={createEntity()} />);

    expect(markup).toContain("Spell Power");
    expect(markup).not.toContain("SpellPower");
  });

  it("does not produce a leading space for PascalCase keys", () => {
    const markup = renderToStaticMarkup(<StatBlockSection data={createEntity()} />);

    expect(markup).not.toContain(" Spell Power");
  });

  it("renders structured stat block details in the core rows", () => {
    const entity = createEntity({
      statBlock: {
        hp: 84,
        hitDice: "8d10 + 40",
        armor: 15,
        armorNote: "natural armor",
        speed: 30,
        burrowSpeed: null,
        climbSpeed: 20,
        flySpeed: null,
        swimSpeed: null,
        hoverSpeed: null,
        initiativeBonus: null,
        strength: 18,
        dexterity: 13,
        constitution: 20,
        intelligence: 7,
        wisdom: 9,
        charisma: 7,
        custom: {},
      },
    });

    const markup = renderToStaticMarkup(<StatBlockSection data={entity} />);

    expect(markup).toContain("natural armor");
    expect(markup).toContain(">84<");
    expect(markup).toContain("8d10 + 40");
    expect(markup).toContain("30 ft., climb 20 ft.");
    expect(markup).toContain("Initiative");
  });

  it("renders combat and metadata rows even without primary stat block values", () => {
    const entity = createEntity({
      skills: { perception: 4 },
      languages: ["Common"],
      statBlock: {
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
        custom: {},
      },
    });

    const markup = renderToStaticMarkup(<StatBlockSection data={entity} />);

    expect(markup).toContain("Skills");
    expect(markup).toContain("Perception +4");
    expect(markup).toContain("Senses");
    expect(markup).toContain("passive Perception 14");
    expect(markup).toContain("Languages");
    expect(markup).toContain("Common");
  });
});
