import { describe, expect, it } from "vitest";
import {
  IDENTITY_Q,
  mat3FromUnitQuat,
  mat3MulVec3,
  mat3ToUnitQuat,
  quatAngle,
  quatInverse,
  quatMul,
  quatNorm,
  quatToCSSMatrix,
} from "@/lib/dice/quaternion";

describe("quatToCSSMatrix", () => {
  it("matches golden for identity", () => {
    expect(quatToCSSMatrix(IDENTITY_Q)).toBe(
      "matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)",
    );
  });

  it("matches golden for a fixed normalized quaternion", () => {
    const q = quatNorm([0.25, 0.1, 0.05, 0.96]);
    expect(quatToCSSMatrix(q)).toBe(
      "matrix3d(0.9749147100140477,0.14649809351796111,-0.167569737106161,0,-0.04615693357415212,0.8695564920730483,0.4916716837246641,0,0.2177403170780655,-0.47160345173590223,0.854505318081477,0,0,0,0,1)",
    );
  });
});

describe("quatNorm", () => {
  it("produces unit length", () => {
    const q = quatNorm([3, 4, 12, 84]);
    const len = Math.hypot(q[0], q[1], q[2], q[3]);
    expect(len).toBeCloseTo(1, 10);
  });
});

describe("quatAngle", () => {
  it("is zero for identical orientations", () => {
    const q = quatNorm([0.1, 0.2, 0.3, 0.9]);
    expect(quatAngle(q, q)).toBeCloseTo(0, 10);
  });

  it("is symmetric", () => {
    const a = quatNorm([0.2, 0.1, 0.4, 0.88]);
    const b = quatNorm([0.15, 0.35, 0.2, 0.9]);
    expect(quatAngle(a, b)).toBeCloseTo(quatAngle(b, a), 10);
  });
});

describe("quatMul", () => {
  it("uses identity as neutral element", () => {
    const q = quatNorm([0.11, 0.22, 0.33, 0.9]);
    expect(quatMul(IDENTITY_Q, q)).toEqual(q);
    expect(quatMul(q, IDENTITY_Q)).toEqual(q);
  });
});

describe("quatInverse", () => {
  it("yields identity when composed with the original", () => {
    const q = quatNorm([0.15, -0.28, 0.42, 0.85]);
    const composed = quatMul(q, quatInverse(q));
    expect(quatAngle(composed, IDENTITY_Q)).toBeLessThan(1e-9);
  });

  it("is its own inverse on unit quaternions", () => {
    const q = quatNorm([0.2, 0.1, 0.4, 0.88]);
    const twice = quatInverse(quatInverse(q));
    expect(quatAngle(q, twice)).toBeLessThan(1e-9);
  });
});

describe("mat3ToUnitQuat / mat3MulVec3", () => {
  it("round-trips rotation matrix for a random unit quaternion", () => {
    const q0 = quatNorm([0.15, -0.28, 0.42, 0.85]);
    const m = mat3FromUnitQuat(q0);
    const q1 = mat3ToUnitQuat(m);
    expect(quatAngle(q0, q1)).toBeLessThan(1e-9);
  });

  it("rotates e1 with identity matrix", () => {
    const m = mat3FromUnitQuat(IDENTITY_Q);
    expect(mat3MulVec3(m, [1, 0, 0])).toEqual([1, 0, 0]);
  });
});
