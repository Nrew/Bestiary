import { describe, expect, it } from "vitest";
import {
  dominantContextIndex,
  nearestSnapQuat,
  SNAP_QUATERNIONS,
} from "@/lib/dice/tetrahedron";
import { quatAngle, slerp } from "@/lib/dice/quaternion";

describe("dominantContextIndex", () => {
  it("selects each face index at its snap orientation", () => {
    for (let i = 0; i < SNAP_QUATERNIONS.length; i++) {
      expect(dominantContextIndex(SNAP_QUATERNIONS[i])).toBe(i);
    }
  });
});

describe("nearestSnapQuat", () => {
  it("returns the same snap quaternion at each snap (identity property)", () => {
    for (const snap of SNAP_QUATERNIONS) {
      const result = nearestSnapQuat(snap);
      expect(quatAngle(result, snap)).toBeLessThan(1e-6);
    }
  });

  it("picks the closer of two snaps when interpolating between them", () => {
    // Slerp from snap[0] toward snap[1] at t=0.1 (10% of the way). The result
    // is still much closer to snap[0] than snap[1], so nearestSnapQuat must
    // return snap[0]. Symmetrically at t=0.9 it must return snap[1].
    const near0 = slerp(SNAP_QUATERNIONS[0], SNAP_QUATERNIONS[1], 0.1);
    const near1 = slerp(SNAP_QUATERNIONS[0], SNAP_QUATERNIONS[1], 0.9);

    expect(quatAngle(nearestSnapQuat(near0), SNAP_QUATERNIONS[0])).toBeLessThan(1e-6);
    expect(quatAngle(nearestSnapQuat(near1), SNAP_QUATERNIONS[1])).toBeLessThan(1e-6);
  });

  it("returns one of the four snap quaternions for arbitrary inputs", () => {
    // Sweep several arbitrary orientations and confirm the answer is always
    // one of the 4 canonical snaps (not a continuous "nearest direction"
    // which would defeat the snap purpose).
    const arbitrary = [
      slerp(SNAP_QUATERNIONS[0], SNAP_QUATERNIONS[2], 0.3),
      slerp(SNAP_QUATERNIONS[1], SNAP_QUATERNIONS[3], 0.6),
      slerp(SNAP_QUATERNIONS[2], SNAP_QUATERNIONS[0], 0.42),
    ];
    for (const q of arbitrary) {
      const result = nearestSnapQuat(q);
      const minDist = Math.min(
        ...SNAP_QUATERNIONS.map((s) => quatAngle(result, s)),
      );
      expect(minDist).toBeLessThan(1e-6);
    }
  });
});
