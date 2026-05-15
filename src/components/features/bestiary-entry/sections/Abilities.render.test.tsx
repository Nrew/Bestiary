import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Ability, Entity } from "@/types";

vi.mock("@/hooks/useEntityAbilities", () => ({
  useEntityAbilities: vi.fn(),
}));

vi.mock("@/components/shared/RichTextViewer", () => ({
  RichTextViewer: ({ html }: { html: string }) => (
    <span dangerouslySetInnerHTML={{ __html: html }} />
  ),
}));

const { AbilitiesSection } = await import("./Abilities");
const { useEntityAbilities } = await import("@/hooks/useEntityAbilities");

function makeAbility(id: string, name: string): Ability {
  return {
    id,
    name,
    slug: id,
    description: "<p>Test.</p>",
    timing: "action",
    category: "none",
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

const baseEntity: Entity = {
  id: "e1",
  name: "Dragon",
  slug: "dragon",
  taxonomy: { genus: null, species: null, subspecies: null },
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
    hp: null, hitDice: null, armor: null, armorNote: null,
    speed: null, burrowSpeed: null, climbSpeed: null, flySpeed: null,
    swimSpeed: null, hoverSpeed: null, initiativeBonus: null,
    strength: null, dexterity: null, constitution: null,
    intelligence: null, wisdom: null, charisma: null,
    custom: {},
  },
  notes: "",
  statusIds: [],
  abilityIds: ["m1", "r1"],
  inventory: [],
  images: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("AbilitiesSection — category groups", () => {
  it("renders Multiattack and Regional Effects sections when present", () => {
    vi.mocked(useEntityAbilities).mockReturnValue({
      traits: [],
      actions: [],
      bonusActions: [],
      reactions: [],
      legendaryActions: [],
      mythicActions: [],
      lairActions: [],
      multiattacks: [makeAbility("m1", "Multiattack Stub")],
      regionalEffects: [makeAbility("r1", "Tremors")],
      missingIds: [],
      loading: false,
      error: null,
    });

    const markup = renderToStaticMarkup(
      <AbilitiesSection data={baseEntity} abilities={vi.mocked(useEntityAbilities)(baseEntity)} />
    );

    expect(markup).toContain("Multiattack");
    expect(markup).toContain("Regional Effects");
  });

  it("does not render Multiattack section when bucket is empty", () => {
    vi.mocked(useEntityAbilities).mockReturnValue({
      traits: [],
      actions: [],
      bonusActions: [],
      reactions: [],
      legendaryActions: [],
      mythicActions: [],
      lairActions: [],
      multiattacks: [],
      regionalEffects: [],
      missingIds: [],
      loading: false,
      error: null,
    });

    const markup = renderToStaticMarkup(
      <AbilitiesSection data={baseEntity} abilities={vi.mocked(useEntityAbilities)(baseEntity)} />
    );

    expect(markup).not.toContain("Multiattack");
    expect(markup).not.toContain("Regional Effects");
  });
});
