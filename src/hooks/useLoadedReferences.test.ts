import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it } from "vitest";
import { useLoadedReferences } from "./useLoadedReferences";

interface Probe<T> {
  entries: T[];
  missingIds: string[];
  loading: boolean;
}

function readProbe<T>(ids: readonly string[], map: ReadonlyMap<string, T>): Probe<T> {
  let captured: Probe<T> | null = null;
  const Harness: React.FC = () => {
    const { entries, missingIds, loading } = useLoadedReferences(
      ids,
      map,
      async () => {},
    );
    captured = { entries, missingIds, loading };
    return null;
  };
  renderToStaticMarkup(React.createElement(Harness));
  if (captured === null) throw new Error("Harness did not render");
  return captured;
}

describe("useLoadedReferences", () => {
  it("deduplicates ids when resolving entries", () => {
    const map = new Map<string, { id: string; name: string }>([
      ["a", { id: "a", name: "Alpha" }],
      ["b", { id: "b", name: "Beta" }],
    ]);

    const probe = readProbe(["a", "a", "b"], map);
    expect(probe.entries.map((e) => e.id)).toEqual(["a", "b"]);
    expect(probe.missingIds).toEqual([]);
  });

  it("reports unique missingIds for duplicate unloaded ids", () => {
    const probe = readProbe(["x", "x", "y"], new Map<string, { id: string }>());
    expect(probe.entries).toEqual([]);
    expect([...probe.missingIds].sort()).toEqual(["x", "y"]);
  });

  it("returns empty state for empty ids", () => {
    const probe = readProbe([], new Map());
    expect(probe.entries).toEqual([]);
    expect(probe.missingIds).toEqual([]);
    expect(probe.loading).toBe(false);
  });
});
