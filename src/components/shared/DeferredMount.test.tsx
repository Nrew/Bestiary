import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { DeferredMount } from "./DeferredMount";

describe("DeferredMount", () => {
  let originalNodeEnv: string | undefined;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
    // React logs the thrown error to console.error; suppress to keep test output clean.
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    consoleErrorSpy.mockRestore();
  });

  it("throws in development when given more than one child", () => {
    process.env.NODE_ENV = "development";
    expect(() =>
      renderToStaticMarkup(
        <DeferredMount fallback={<span>loading</span>}>
          <span>a</span>
          <span>b</span>
        </DeferredMount>,
      ),
    ).toThrow(/exactly one child element/i);
  });

  it("renders the fallback on initial server render", () => {
    process.env.NODE_ENV = "development";
    const html = renderToStaticMarkup(
      <DeferredMount fallback={<span>loading</span>}>
        <span>real content</span>
      </DeferredMount>,
    );
    expect(html).toContain("loading");
    expect(html).not.toContain("real content");
  });
});
