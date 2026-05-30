import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import { useForm, FormProvider, type DefaultValues } from "react-hook-form";
import type { Ability, AbilityEffect } from "@/types";

vi.mock("@/store/appStore", () => ({
  useGameEnums: () => ({ attributes: ["strength", "dexterity"], damageTypes: ["fire"] }),
}));

vi.mock("./SingleEntryPicker", () => ({
  SingleEntryPicker: ({ label }: { label: string }) => <div data-testid="status-picker">{label}</div>,
}));

const { NestedEffectsEditor } = await import("./NestedEffectsEditor");

function Harness({ sub }: { sub: AbilityEffect }) {
  const methods = useForm<Ability>({
    defaultValues: {
      effects: [{ type: "areaOfEffect", shape: "sphere", size: 20, effects: [sub] }],
    } as unknown as DefaultValues<Ability>,
  });
  return (
    <FormProvider {...methods}>
      <NestedEffectsEditor parentIndex={0} />
    </FormProvider>
  );
}

describe("NestedEffectsEditor", () => {
  it("renders editable fields for an applyStatus sub-effect", () => {
    const html = renderToStaticMarkup(
      <Harness sub={{ type: "applyStatus", statusId: "", duration: "1 minute", savingThrow: null }} />
    );
    expect(html).toContain("status-picker");
    expect(html).toContain('id="nested-effect-0-0-status-duration"');
  });

  it("renders editable fields for a modifyStat sub-effect", () => {
    const html = renderToStaticMarkup(
      <Harness sub={{ type: "modifyStat", attribute: "strength", value: { type: "flat", value: 2 }, durationRounds: 10 }} />
    );
    expect(html).toContain('id="nested-effect-0-0-modstat-attr"');
    expect(html).toContain('id="nested-effect-0-0-modstat-value"');
    expect(html).toContain('id="nested-effect-0-0-modstat-duration"');
  });
});
