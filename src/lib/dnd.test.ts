import { describe, it, expect } from "vitest";
import {
  // Ability scores
  calculateAbilityModifier,
  formatAbilityModifier,
  // Proficiency & CR
  calculateProficiencyBonus,
  formatChallengeRating,
  getExperiencePoints,
  // Derived stats
  calculateSaveDC,
  calculateAttackBonus,
  calculateSkillModifier,
  calculatePassiveCheck,
  calculateConcentrationDC,
  calculateInitiativeModifier,
  calculateArmorClass,
  // Dice & damage
  parseDamageFormula,
  applyDamageModifier,
  isValidDiceFormula,
  // Hit points
  calculateHitPoints,
  getHitDieFromSize,
  estimateHitDiceCount,
  // Monster creation toolkit
  getMonsterStatsByCR,
  estimateDefensiveCR,
  estimateOffensiveCR,
  estimateMonsterCR,
  // Encounter difficulty
  getMonsterXP,
  calculateXPThresholds,
  calculateEncounterDifficulty,
} from "./dnd";


describe("calculateAbilityModifier", () => {
  it("maps standard scores to SRD modifiers", () => {
    expect(calculateAbilityModifier(10)).toBe(0);
    expect(calculateAbilityModifier(11)).toBe(0);
    expect(calculateAbilityModifier(12)).toBe(1);
    expect(calculateAbilityModifier(20)).toBe(5);
    expect(calculateAbilityModifier(8)).toBe(-1);
    expect(calculateAbilityModifier(1)).toBe(-5);
    expect(calculateAbilityModifier(30)).toBe(10);
  });
});

describe("formatAbilityModifier", () => {
  it("formats positive modifiers with a plus sign", () => {
    expect(formatAbilityModifier(14)).toBe("+2");
    expect(formatAbilityModifier(10)).toBe("+0");
  });

  it("formats negative modifiers with a minus sign", () => {
    expect(formatAbilityModifier(8)).toBe("-1");
  });
});


describe("calculateProficiencyBonus", () => {
  it("returns +2 for CR 0–4", () => {
    expect(calculateProficiencyBonus(0)).toBe(2);
    expect(calculateProficiencyBonus(0.5)).toBe(2);
    expect(calculateProficiencyBonus(4)).toBe(2);
  });

  it("increases every 4 CRs", () => {
    expect(calculateProficiencyBonus(5)).toBe(3);
    expect(calculateProficiencyBonus(9)).toBe(4);
    expect(calculateProficiencyBonus(17)).toBe(6);
    expect(calculateProficiencyBonus(30)).toBe(9);
  });
});

describe("formatChallengeRating", () => {
  it("formats fractional CRs as strings", () => {
    expect(formatChallengeRating(0.125)).toBe("1/8");
    expect(formatChallengeRating(0.25)).toBe("1/4");
    expect(formatChallengeRating(0.5)).toBe("1/2");
  });

  it("formats integer CRs as digit strings", () => {
    expect(formatChallengeRating(1)).toBe("1");
    expect(formatChallengeRating(20)).toBe("20");
  });
});

describe("getExperiencePoints", () => {
  it("returns correct XP for standard CRs", () => {
    expect(getExperiencePoints(0)).toBe(10);
    expect(getExperiencePoints(1)).toBe(200);
    expect(getExperiencePoints(20)).toBe(25000);
  });
});


describe("calculateSaveDC", () => {
  it("follows the SRD formula: 8 + prof + ability mod", () => {
    // Ability 18 (+4 mod) + proficiency 3 = DC 15
    expect(calculateSaveDC(18, 3)).toBe(15);
    // Ability 10 (+0) + proficiency 2 = DC 10
    expect(calculateSaveDC(10, 2)).toBe(10);
  });
});

describe("calculateAttackBonus", () => {
  it("adds proficiency when proficient", () => {
    expect(calculateAttackBonus(16, 3, true)).toBe(6);  // +3 mod + 3 prof
  });

  it("omits proficiency when not proficient", () => {
    expect(calculateAttackBonus(16, 3, false)).toBe(3);  // +3 mod only
  });
});

describe("calculateSkillModifier", () => {
  it("returns base ability modifier for 'none'", () => {
    expect(calculateSkillModifier(14, 3, "none")).toBe(2);
  });

  it("adds half proficiency for 'half'", () => {
    expect(calculateSkillModifier(14, 4, "half")).toBe(4); // 2 + floor(4/2)
  });

  it("adds full proficiency for 'proficient'", () => {
    expect(calculateSkillModifier(14, 3, "proficient")).toBe(5);
  });

  it("doubles proficiency for 'expertise'", () => {
    expect(calculateSkillModifier(14, 3, "expertise")).toBe(8);
  });
});

describe("calculatePassiveCheck", () => {
  it("returns 10 + skill modifier", () => {
    expect(calculatePassiveCheck(5)).toBe(15);  // passive perception with +5
    expect(calculatePassiveCheck(0)).toBe(10);
    expect(calculatePassiveCheck(-1)).toBe(9);
  });
});

describe("calculateConcentrationDC", () => {
  it("returns max(10, half damage)", () => {
    expect(calculateConcentrationDC(30)).toBe(15);  // half of 30
    expect(calculateConcentrationDC(10)).toBe(10);  // half is 5, min 10 applies
    expect(calculateConcentrationDC(1)).toBe(10);   // half is 0, min 10 applies
    expect(calculateConcentrationDC(21)).toBe(10);  // half is 10 (floor), equals min
  });
});

describe("calculateInitiativeModifier", () => {
  it("equals the dexterity modifier", () => {
    expect(calculateInitiativeModifier(14)).toBe(2);
    expect(calculateInitiativeModifier(8)).toBe(-1);
  });
});

describe("calculateArmorClass", () => {
  it("unarmored: 10 + dex + natural armor", () => {
    expect(calculateArmorClass(0, 3, "none", false, 2)).toBe(15);
  });

  it("light armor: base + dex", () => {
    expect(calculateArmorClass(11, 3, "light")).toBe(14);
  });

  it("medium armor: base + min(dex, 2)", () => {
    expect(calculateArmorClass(14, 4, "medium")).toBe(16);
    expect(calculateArmorClass(14, 1, "medium")).toBe(15);
  });

  it("heavy armor: base only", () => {
    expect(calculateArmorClass(18, 5, "heavy")).toBe(18);
  });

  it("shield adds +2", () => {
    expect(calculateArmorClass(0, 2, "none", true)).toBe(14);
  });
});


describe("parseDamageFormula", () => {
  it("parses XdY+Z and computes the average", () => {
    // 2d6+3 average = 2 × (6+1)/2 + 3 = 7 + 3 = 10
    expect(parseDamageFormula("2d6+3")).toEqual({
      numDice: 2, dieSize: 6, modifier: 3, average: 10,
    });
  });

  it("handles negative modifiers", () => {
    // 1d20-1 average = 10.5 - 1 = 9.5, floored to 9.
    const r = parseDamageFormula("1d20-1");
    expect(r.modifier).toBe(-1);
    expect(r.average).toBe(9);
  });

  it("handles formulas without a modifier", () => {
    expect(parseDamageFormula("1d8")).toEqual({
      numDice: 1, dieSize: 8, modifier: 0, average: 4,
    });
  });

  it("throws on malformed input", () => {
    expect(() => parseDamageFormula("not-dice")).toThrow();
    expect(() => parseDamageFormula("")).toThrow();
  });
});

describe("applyDamageModifier", () => {
  it("doubles damage for vulnerable", () => {
    expect(applyDamageModifier(10, "vulnerable")).toBe(20);
  });

  it("halves damage (floor) for resistant", () => {
    expect(applyDamageModifier(11, "resistant")).toBe(5);
  });

  it("zeroes damage for immune", () => {
    expect(applyDamageModifier(100, "immune")).toBe(0);
  });
});

describe("isValidDiceFormula", () => {
  it("accepts valid formulas", () => {
    expect(isValidDiceFormula("1d6")).toBe(true);
    expect(isValidDiceFormula("2d8+3")).toBe(true);
    expect(isValidDiceFormula("10d10-5")).toBe(true);
  });

  it("rejects invalid formulas", () => {
    expect(isValidDiceFormula("not-dice")).toBe(false);
    expect(isValidDiceFormula("d6")).toBe(false);
    expect(isValidDiceFormula("")).toBe(false);
  });
});


describe("calculateHitPoints", () => {
  it("computes average HP for a standard humanoid", () => {
    // Fighter: 5d10 + 5×2 (CON 14, +2 mod) = avg 27.5 + 10 = 37 (floor 37)
    const r = calculateHitPoints(5, 10, 2);
    expect(r.average).toBe(37);
    expect(r.minimum).toBe(15);   // 5 × (1 + 2)
    expect(r.maximum).toBe(60);   // 5 × (10 + 2)
    expect(r.hitDice).toBe("5d10");
  });

  it("enforces minimum HP of 1", () => {
    const r = calculateHitPoints(1, 4, -3);  // 1d4 - 3, could be negative
    expect(r.minimum).toBe(1);
    expect(r.average).toBe(1);
  });
});

describe("getHitDieFromSize", () => {
  it("returns correct die sizes per SRD", () => {
    expect(getHitDieFromSize("tiny")).toBe(4);
    expect(getHitDieFromSize("small")).toBe(6);
    expect(getHitDieFromSize("medium")).toBe(8);
    expect(getHitDieFromSize("large")).toBe(10);
    expect(getHitDieFromSize("huge")).toBe(12);
    expect(getHitDieFromSize("gargantuan")).toBe(20);
  });
});

describe("estimateHitDiceCount", () => {
  it("estimates dice count from HP and size", () => {
    // Medium creature, CON 10 (+0): average 4.5 per d8, so 36 HP is about 8 dice.
    expect(estimateHitDiceCount(36, "medium", 0)).toBe(8);
  });
});


describe("getMonsterStatsByCR", () => {
  it("returns the DMG stat profile for standard CRs", () => {
    const cr5 = getMonsterStatsByCR(5);
    expect(cr5).not.toBeNull();
    expect(cr5?.profBonus).toBe(3);
    expect(cr5?.acExpected).toBe(15);
    expect(cr5?.attackBonus).toBe(6);
    expect(cr5?.saveDC).toBe(15);
  });

  it("returns null for out-of-range CRs", () => {
    expect(getMonsterStatsByCR(31)).toBeNull();
    expect(getMonsterStatsByCR(-1)).toBeNull();
  });

  it("handles fractional CRs", () => {
    const half = getMonsterStatsByCR(0.5);
    expect(half?.hpMin).toBe(50);
    expect(half?.hpMax).toBe(70);
  });
});

describe("estimateDefensiveCR", () => {
  it("estimates CR from HP within the expected range", () => {
    // HP 90, AC 13 (expected for CR 2), so CR 2.
    expect(estimateDefensiveCR(90, 13)).toBe(2);
  });

  it("adjusts upward when AC exceeds the table expectation", () => {
    // HP 90 gives base CR 2. AC 17 is +4 above expected, so CR 4.
    expect(estimateDefensiveCR(90, 17)).toBe(4);
  });

  it("adjusts downward when AC is below the table expectation", () => {
    // HP 90 gives base CR 2. AC 9 is -4 below expected, so CR 0.
    expect(estimateDefensiveCR(90, 9)).toBe(0);
  });
});

describe("estimateOffensiveCR", () => {
  it("estimates CR from damage per round alone", () => {
    // DPR 35 falls in CR 5 range (33-38), so CR 5.
    expect(estimateOffensiveCR(35)).toBe(5);
  });

  it("adjusts upward when attack bonus exceeds the expected value", () => {
    // DPR 35 gives base CR 5. Attack +10 is +4 above expected, so CR 7.
    expect(estimateOffensiveCR(35, { attackBonus: 10 })).toBe(7);
  });

  it("adjusts using save DC independently from attack bonus", () => {
    // DPR 35 gives base CR 5. Save DC 11 is -4 below expected, so CR 3.
    expect(estimateOffensiveCR(35, { saveDC: 11 })).toBe(3);
  });
});

describe("estimateMonsterCR", () => {
  it("averages defensive and offensive CR, snapping to the nearest valid CR", () => {
    // Defensive CR 4 and offensive CR 6 average to CR 5.
    expect(estimateMonsterCR(4, 6)).toBe(5);
  });

  it("uses half-up rounding when equidistant between two CRs", () => {
    // Average 1.5 is equidistant between CR 1 and CR 2, so it rounds up.
    expect(estimateMonsterCR(1, 2)).toBe(2);
  });
});


describe("getMonsterXP", () => {
  it("maps fractional CRs to SRD values", () => {
    expect(getMonsterXP(0)).toBe(10);
    expect(getMonsterXP(0.125)).toBe(25);
    expect(getMonsterXP(0.25)).toBe(50);
    expect(getMonsterXP(0.5)).toBe(100);
  });

  it("maps integer CRs to SRD values", () => {
    expect(getMonsterXP(1)).toBe(200);
    expect(getMonsterXP(5)).toBe(1800);
    expect(getMonsterXP(20)).toBe(25000);
    expect(getMonsterXP(30)).toBe(155000);
  });

  it("returns 0 for null and unknown CRs", () => {
    expect(getMonsterXP(null)).toBe(0);
    expect(getMonsterXP(99)).toBe(0);
  });
});

describe("calculateXPThresholds", () => {
  it("sums per-level thresholds across the party", () => {
    // Two level-5 PCs: easy 250 + 250, medium 500 + 500, hard 750 + 750, deadly 1100 + 1100
    const t = calculateXPThresholds([5, 5]);
    expect(t).toEqual({ easy: 500, medium: 1000, hard: 1500, deadly: 2200 });
  });

  it("clamps levels to the [1, 20] table range", () => {
    const t = calculateXPThresholds([0, 25]);
    expect(t).toEqual({ easy: 2825, medium: 5750, hard: 8575, deadly: 12800 });
  });
});

describe("calculateEncounterDifficulty", () => {
  it("classifies a single CR-1 against four level-1 PCs as medium", () => {
    const r = calculateEncounterDifficulty([1, 1, 1, 1], [1]);
    expect(r.rawXp).toBe(200);
    expect(r.multiplier).toBe(1);
    expect(r.adjustedXp).toBe(200);
    expect(r.difficulty).toBe("medium");
  });

  it("applies the 3-monster ×2 multiplier", () => {
    const r = calculateEncounterDifficulty([5, 5, 5, 5], [1, 1, 1]);
    expect(r.rawXp).toBe(600);
    expect(r.multiplier).toBe(2);
    expect(r.adjustedXp).toBe(1200);
  });

  it("classifies an empty monster roster as trivial", () => {
    const r = calculateEncounterDifficulty([5, 5, 5, 5], []);
    expect(r.adjustedXp).toBe(0);
    expect(r.difficulty).toBe("trivial");
  });

  it("classifies a CR-10 monster against a level-5 party of 4 as deadly", () => {
    const r = calculateEncounterDifficulty([5, 5, 5, 5], [10]);
    expect(r.adjustedXp).toBe(5900);
    expect(r.thresholds.deadly).toBe(4400);
    expect(r.difficulty).toBe("deadly");
  });
});
