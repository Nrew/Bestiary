import { describe, expect, it } from "vitest";
import { lootRollDropped } from "./loot";

const d100 = Array.from({ length: 100 }, (_, i) => i + 1);
const winningRolls = (dropChance: number) =>
  d100.filter((roll) => lootRollDropped(roll, dropChance)).length;

describe("lootRollDropped", () => {
  it("matches the displayed percentage exactly, without float drift", () => {
    expect(winningRolls(0.55)).toBe(55);
    expect(winningRolls(0.05)).toBe(5);
    expect(winningRolls(0.5)).toBe(50);
  });

  it("never drops at 0% and always drops at 100%", () => {
    expect(winningRolls(0)).toBe(0);
    expect(winningRolls(1)).toBe(100);
  });
});
