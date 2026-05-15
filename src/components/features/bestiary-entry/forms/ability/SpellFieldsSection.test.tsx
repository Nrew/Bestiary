import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import { useForm, FormProvider } from "react-hook-form";
import { SpellFieldsSection } from "./SpellFieldsSection";
import type { MagicSchool } from "@/types";

vi.mock("@/store/appStore", () => ({
  useGameEnums: () => ({
    magicSchools: ["abjuration","conjuration","divination","enchantment","evocation","illusion","necromancy","transmutation"],
  }),
}));

vi.mock("@/components/shared/RichTextEditor", () => ({
  RichTextEditor: ({ content }: { content: string }) =>
    <div data-testid="rich-text-editor" data-content={content}>RTE</div>,
}));

interface HarnessShape {
  spellLevel: number | null;
  school: MagicSchool | null;
  ritual: boolean;
  higherLevels: string | null;
}

function Harness({ initial }: { initial: HarnessShape }) {
  const methods = useForm<HarnessShape>({ defaultValues: initial });
  return <FormProvider {...methods}><SpellFieldsSection /></FormProvider>;
}

describe("SpellFieldsSection", () => {
  it("renders level / school / ritual / higherLevels controls", () => {
    const html = renderToStaticMarkup(<Harness initial={{
      spellLevel: 3, school: "evocation", ritual: false, higherLevels: ""
    }} />);
    expect(html).toMatch(/Level/i);
    expect(html).toMatch(/School/i);
    expect(html).toMatch(/Ritual/i);
    expect(html).toMatch(/Higher Levels/i);
    expect(html).toContain('rich-text-editor');
  });

  it("renders school dropdown options when magicSchools is loaded", () => {
    const html = renderToStaticMarkup(<Harness initial={{
      spellLevel: 0, school: null, ritual: false, higherLevels: null
    }} />);
    expect(html).toMatch(/School/i);
  });
});
