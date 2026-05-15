import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import { useForm, FormProvider } from "react-hook-form";
import { UsesEditor } from "./UsesEditor";
import type { AbilityUses } from "@/types";

vi.mock("@/store/appStore", () => ({
  useGameEnums: () => null,
}));

function Harness({ initial }: { initial: AbilityUses | null }) {
  const methods = useForm<{ uses: AbilityUses | null }>({ defaultValues: { uses: initial } });
  return <FormProvider {...methods}><UsesEditor /></FormProvider>;
}

describe("UsesEditor", () => {
  it("shows no dependent fields when initial uses is null (Unlimited)", () => {
    const html = renderToStaticMarkup(<Harness initial={null} />);
    expect(html).not.toMatch(/id="uses-recharge-min"/);
    expect(html).not.toMatch(/id="uses-perday-count"/);
    expect(html).not.toMatch(/id="uses-perrest-count"/);
  });

  it("renders Min/Max inputs when uses is recharge", () => {
    const html = renderToStaticMarkup(
      <Harness initial={{ kind: "recharge", min: 5, max: 6 }} />
    );
    expect(html).toContain('id="uses-recharge-min"');
    expect(html).toContain('id="uses-recharge-max"');
    expect(html).toContain('value="5"');
    expect(html).toContain('value="6"');
  });

  it("renders Count input when uses is perDay", () => {
    const html = renderToStaticMarkup(
      <Harness initial={{ kind: "perDay", count: 3 }} />
    );
    expect(html).toContain('id="uses-perday-count"');
    expect(html).toContain('value="3"');
  });

  it("renders Count + Rest selector when uses is perRest", () => {
    const html = renderToStaticMarkup(
      <Harness initial={{ kind: "perRest", count: 2, rest: "long" }} />
    );
    expect(html).toContain('id="uses-perrest-count"');
    expect(html).toContain('value="2"');
    expect(html).toContain('id="uses-perrest-rest"');
  });

  it("renders nothing extra when uses is atWill or once", () => {
    const htmlAtWill = renderToStaticMarkup(
      <Harness initial={{ kind: "atWill" }} />
    );
    expect(htmlAtWill).not.toContain('id="uses-recharge-min"');
    expect(htmlAtWill).not.toContain('id="uses-perday-count"');

    const htmlOnce = renderToStaticMarkup(
      <Harness initial={{ kind: "once" }} />
    );
    expect(htmlOnce).not.toContain('id="uses-recharge-min"');
    expect(htmlOnce).not.toContain('id="uses-perday-count"');
  });
});
