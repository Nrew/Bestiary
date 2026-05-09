import { describe, expect, it } from "vitest";
import { quatAngle, quatMul } from "@/lib/dice/quaternion";
import {
  dominantContextIndex,
  RELATIVE_SNAP_QUATS,
  SNAP_QUATERNIONS,
} from "@/lib/dice/tetrahedron";

const EPS = 1e-5;

describe("dominantContextIndex", () => {
  it("selects each face index at its snap orientation", () => {
    for (let i = 0; i < SNAP_QUATERNIONS.length; i++) {
      expect(dominantContextIndex(SNAP_QUATERNIONS[i])).toBe(i);
    }
  });
});

describe("RELATIVE_SNAP_QUATS", () => {
  it("right-multiplies snap i into snap j (body-frame composition)", () => {
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        const rel = RELATIVE_SNAP_QUATS[i][j];
        const composed = quatMul(SNAP_QUATERNIONS[i], rel);
        const ang = quatAngle(composed, SNAP_QUATERNIONS[j]);
        expect(ang).toBeLessThan(EPS);
      }
    }
  });
});
