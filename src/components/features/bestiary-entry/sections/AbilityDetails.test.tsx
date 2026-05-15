import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Ability } from "@/types";

vi.mock("@/store/appStore", () => ({
  useAppStore: <T,>(_selector: (state: unknown) => T): T | undefined => undefined,
}));

vi.mock("@/components/shared/wiki-link/WikiLinkProvider", () => ({
  useWikiLink: () => ({ showTooltip: vi.fn(), hideTooltip: vi.fn() }),
}));

vi.mock("@/hooks/useReferencedEntryName", () => ({
  useReferencedEntryName: () => ({ status: "found", name: "Test" }),
}));

vi.mock("@/components/shared/RichTextViewer", () => ({
  RichTextViewer: ({ html }: { html: string }) => (
    <span dangerouslySetInnerHTML={{ __html: html }} />
  ),
}));

const { AbilityDetailsSection } = await import("./AbilityDetails");

function makeAbility(overrides: Partial<Ability> = {}): Ability {
  return {
    id: "a1",
    name: "Test Ability",
    slug: "test-ability",
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
    ...overrides,
  };
}

describe("AbilityDetailsSection — spell metadata", () => {
  it("renders spell metadata when present", () => {
    const ability = makeAbility({
      spellLevel: 3,
      school: "evocation",
      ritual: true,
      higherLevels: "<p>+1d6 per slot</p>",
    });

    const markup = renderToStaticMarkup(<AbilityDetailsSection data={ability} />);

    expect(markup).toContain("3rd");
    expect(markup).toContain("Evocation");
    expect(markup).toContain("ritual");
    expect(markup).toContain("At Higher Levels");
    expect(markup).toContain("+1d6 per slot");
  });

  it("renders Cantrip label for spellLevel 0", () => {
    const ability = makeAbility({
      spellLevel: 0,
      school: "evocation",
    });

    const markup = renderToStaticMarkup(<AbilityDetailsSection data={ability} />);

    expect(markup).toContain("Cantrip");
    expect(markup).toContain("Evocation");
  });

  it("hides spell metadata when category != none", () => {
    const ability = makeAbility({
      category: "multiattack",
    });

    const markup = renderToStaticMarkup(<AbilityDetailsSection data={ability} />);

    expect(markup).not.toContain("At Higher Levels");
  });
});

describe("AbilityDetailsSection — uses row", () => {
  it("renders structured uses summary for recharge variant", () => {
    const ability = makeAbility({
      uses: { kind: "recharge", min: 5, max: 6 },
    });

    const markup = renderToStaticMarkup(<AbilityDetailsSection data={ability} />);

    expect(markup).toContain("Recharge 5-6");
  });

  it("omits the uses row when uses is null", () => {
    const ability = makeAbility({ uses: null });

    const markup = renderToStaticMarkup(<AbilityDetailsSection data={ability} />);

    expect(markup).not.toContain("Uses");
  });
});
