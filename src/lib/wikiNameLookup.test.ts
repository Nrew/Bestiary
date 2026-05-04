import { describe, expect, it } from "vitest";
import { buildWikiNameLookup } from "@/lib/wikiNameLookup";
import type { BestiaryEntry } from "@/types";

describe("buildWikiNameLookup", () => {
  it("last context wins when display names collide case-insensitively", () => {
    const e = { id: "e1", name: "Goblin" } as BestiaryEntry;
    const st = { id: "s1", name: "goblin" } as BestiaryEntry;
    const map = buildWikiNameLookup({
      entities: new Map([[e.id, e]]),
      items: new Map(),
      statuses: new Map([[st.id, st]]),
      abilities: new Map(),
    });
    const hit = map.get("goblin");
    expect(hit).toEqual({ id: "s1", name: "goblin", type: "statuses" });
  });

  it("abilities override items for the same normalized name", () => {
    const i = { id: "i1", name: "Burning Hands" } as BestiaryEntry;
    const a = { id: "a1", name: "burning hands" } as BestiaryEntry;
    const map = buildWikiNameLookup({
      entities: new Map(),
      items: new Map([[i.id, i]]),
      statuses: new Map(),
      abilities: new Map([[a.id, a]]),
    });
    expect(map.get("burning hands")).toEqual({
      id: "a1",
      name: "burning hands",
      type: "abilities",
    });
  });
});
