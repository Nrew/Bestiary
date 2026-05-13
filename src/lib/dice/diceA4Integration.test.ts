import { describe, expect, it } from "vitest";
import {
  A4_IDENTITY_INDEX,
  A4_ORDER,
  A4_VERTEX_PERMUTATIONS,
  a4PermutationActsCorrectly,
} from "@/lib/dice/a4Symmetry";
import {
  mat3FromUnitQuat,
  mat3MulVec3,
  quatMul,
  type Mat3RowMajor,
} from "@/lib/dice/quaternion";
import { SNAP_QUATERNIONS, TET_VERTICES } from "@/lib/dice/tetrahedron";

function mat3Det(m: Mat3RowMajor): number {
  return (
    m[0] * (m[4] * m[8] - m[5] * m[7]) -
    m[1] * (m[3] * m[8] - m[5] * m[6]) +
    m[2] * (m[3] * m[7] - m[4] * m[6])
  );
}

function assertProperRotationMatrix(m: Mat3RowMajor): void {
  const c0 = mat3MulVec3(m, [1, 0, 0]);
  const c1 = mat3MulVec3(m, [0, 1, 0]);
  const c2 = mat3MulVec3(m, [0, 0, 1]);
  const d01 = c0[0] * c1[0] + c0[1] * c1[1] + c0[2] * c1[2];
  const d02 = c0[0] * c2[0] + c0[1] * c2[1] + c0[2] * c2[2];
  const d12 = c1[0] * c2[0] + c1[1] * c2[1] + c1[2] * c2[2];
  expect(Math.abs(d01)).toBeLessThan(1e-5);
  expect(Math.abs(d02)).toBeLessThan(1e-5);
  expect(Math.abs(d12)).toBeLessThan(1e-5);
  const len0 = Math.hypot(c0[0], c0[1], c0[2]);
  const len1 = Math.hypot(c1[0], c1[1], c1[2]);
  const len2 = Math.hypot(c2[0], c2[1], c2[2]);
  expect(len0).toBeCloseTo(1, 5);
  expect(len1).toBeCloseTo(1, 5);
  expect(len2).toBeCloseTo(1, 5);
  expect(mat3Det(m)).toBeCloseTo(1, 5);
}

describe("dice math ↔ A4", () => {
  it("uses the same tetrahedron vertices for A4 and the mesh", () => {
    expect(TET_VERTICES).toHaveLength(4);
    expect(A4_VERTEX_PERMUTATIONS[A4_IDENTITY_INDEX]).toEqual([0, 1, 2, 3]);
  });

  it("lets every A4 rotation permute the vertex set (numerical symmetry)", () => {
    for (let g = 0; g < A4_ORDER; g++) {
      expect(a4PermutationActsCorrectly(g, 1e-4)).toBe(true);
    }
  });

  it("keeps snap quaternions as proper rotations (orthogonal + det +1)", () => {
    for (const q of SNAP_QUATERNIONS) {
      assertProperRotationMatrix(mat3FromUnitQuat(q));
    }
  });

  it("composes snap-relative quaternions as unit quaternions", () => {
    const a = SNAP_QUATERNIONS[0];
    const b = SNAP_QUATERNIONS[1];
    const prod = quatMul(a, b);
    const len = Math.hypot(prod[0], prod[1], prod[2], prod[3]);
    expect(len).toBeCloseTo(1, 5);
  });
});
