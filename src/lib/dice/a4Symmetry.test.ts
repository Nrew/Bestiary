import { describe, expect, it } from "vitest";
import { IDENTITY_Q, mat3FromUnitQuat, mat3ToUnitQuat, quatAngle, quatMul } from "@/lib/dice/quaternion";
import {
  A4_CAYLEY,
  A4_IDENTITY_INDEX,
  A4_INVERSE,
  A4_ORDER,
  A4_ROTATION_QUATS,
  a4Compose,
  a4PermutationActsCorrectly,
} from "@/lib/dice/a4Symmetry";

describe("A4 symmetry", () => {
  it("enumerates 12 rotations", () => {
    expect(A4_ORDER).toBe(12);
    expect(A4_ROTATION_QUATS).toHaveLength(12);
  });

  it("finds identity quaternion", () => {
    expect(A4_IDENTITY_INDEX).toBeGreaterThanOrEqual(0);
    expect(quatAngle(A4_ROTATION_QUATS[A4_IDENTITY_INDEX], IDENTITY_Q)).toBeLessThan(1e-4);
  });

  it("maps each vertex permutation correctly", () => {
    for (let g = 0; g < A4_ORDER; g++) {
      expect(a4PermutationActsCorrectly(g, 1e-4)).toBe(true);
    }
  });

  it("satisfies inverse with Cayley table", () => {
    const e = A4_IDENTITY_INDEX;
    for (let i = 0; i < A4_ORDER; i++) {
      expect(A4_CAYLEY[i][A4_INVERSE[i]]).toBe(e);
      expect(A4_CAYLEY[A4_INVERSE[i]][i]).toBe(e);
    }
  });

  it("has consistent compose helper", () => {
    for (let i = 0; i < A4_ORDER; i++) {
      for (let j = 0; j < A4_ORDER; j++) {
        expect(a4Compose(i, j)).toBe(A4_CAYLEY[i][j]);
      }
    }
  });

  it("is associative on indices (Cayley table)", () => {
    for (let i = 0; i < A4_ORDER; i++) {
      for (let j = 0; j < A4_ORDER; j++) {
        for (let k = 0; k < A4_ORDER; k++) {
          const a = a4Compose(a4Compose(i, j), k);
          const b = a4Compose(i, a4Compose(j, k));
          expect(a).toBe(b);
        }
      }
    }
  });

  it("matches quaternion multiplication up to nearest element", () => {
    for (let i = 0; i < A4_ORDER; i++) {
      for (let j = 0; j < A4_ORDER; j++) {
        const prod = quatMul(A4_ROTATION_QUATS[i], A4_ROTATION_QUATS[j]);
        const k = A4_CAYLEY[i][j];
        const ang = quatAngle(prod, A4_ROTATION_QUATS[k]);
        expect(ang).toBeLessThan(1e-3);
      }
    }
  });
});

describe("mat3ToUnitQuat", () => {
  it("round-trips with mat3FromUnitQuat for identity", () => {
    const q = mat3ToUnitQuat(mat3FromUnitQuat(IDENTITY_Q));
    expect(quatAngle(q, IDENTITY_Q)).toBeLessThan(1e-9);
  });
});
