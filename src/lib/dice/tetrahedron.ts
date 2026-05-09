import {
  type Quat,
  type Vec3,
  quatMul,
  quatNorm,
  mat3FromUnitQuat,
  worldZOfBodyNormal,
} from "@/lib/dice/quaternion";
import {
  A4_ORDER,
  A4_VERTEX_PERMUTATIONS,
  a4Compose,
  a4Inverse,
  a4Quat,
} from "@/lib/dice/a4Symmetry";

const INV_SQRT3 = 1 / Math.sqrt(3);

export const TETRAHEDRON_EDGE_PX = 240;
export const TRIANGLE_HEIGHT_PX = (TETRAHEDRON_EDGE_PX * Math.sqrt(3)) / 2;
const VERTEX_SCALE = TETRAHEDRON_EDGE_PX / (2 * Math.sqrt(2));

/** Centered regular tetrahedron vertices in body space (matches d4 mesh). */
export const TET_VERTICES: readonly Vec3[] = [
  [VERTEX_SCALE, VERTEX_SCALE, VERTEX_SCALE],
  [VERTEX_SCALE, -VERTEX_SCALE, -VERTEX_SCALE],
  [-VERTEX_SCALE, VERTEX_SCALE, -VERTEX_SCALE],
  [-VERTEX_SCALE, -VERTEX_SCALE, VERTEX_SCALE],
];

const FACE_VERTEX_INDICES: readonly (readonly [number, number, number])[] = [
  [1, 3, 2],
  [0, 2, 3],
  [0, 3, 1],
  [0, 1, 2],
];

export const FACE_NORMALS: readonly Vec3[] = [
  [-INV_SQRT3, -INV_SQRT3, -INV_SQRT3],
  [-INV_SQRT3, INV_SQRT3, INV_SQRT3],
  [INV_SQRT3, -INV_SQRT3, INV_SQRT3],
  [INV_SQRT3, INV_SQRT3, -INV_SQRT3],
];

const FACE_UPS: readonly Vec3[] = FACE_VERTEX_INDICES.map(([ai, bi, ci]) => {
  const va = TET_VERTICES[ai],
    vb = TET_VERTICES[bi],
    vc = TET_VERTICES[ci];
  const cx = (va[0] + vb[0] + vc[0]) / 3;
  const cy = (va[1] + vb[1] + vc[1]) / 3;
  const cz = (va[2] + vb[2] + vc[2]) / 3;
  const dx = va[0] - cx,
    dy = va[1] - cy,
    dz = va[2] - cz;
  const len = Math.hypot(dx, dy, dz);
  return [dx / len, dy / len, dz / len];
});

function faceMatrix3d(a: Vec3, b: Vec3, c: Vec3, n: Vec3): string {
  const cx = (a[0] + b[0] + c[0]) / 3;
  const cy = (a[1] + b[1] + c[1]) / 3;
  const cz = (a[2] + b[2] + c[2]) / 3;
  const E = TETRAHEDRON_EDGE_PX;
  const k = 3 / (2 * TRIANGLE_HEIGHT_PX);
  return (
    `matrix3d(` +
    `${(b[0] - c[0]) / E},${(b[1] - c[1]) / E},${(b[2] - c[2]) / E},0,` +
    `${(cx - a[0]) * k},${(cy - a[1]) * k},${(cz - a[2]) * k},0,` +
    `${n[0]},${n[1]},${n[2]},0,` +
    `${cx},${cy},${cz},1)`
  );
}

export const FACE_TRANSFORMS = FACE_VERTEX_INDICES.map(([ai, bi, ci], i) =>
  faceMatrix3d(TET_VERTICES[ai], TET_VERTICES[bi], TET_VERTICES[ci], FACE_NORMALS[i]),
);

function snapQuatForFace(n: Vec3, up: Vec3): Quat {
  const sX = n[1] * up[2] - n[2] * up[1];
  const sY = n[2] * up[0] - n[0] * up[2];
  const sZ = n[0] * up[1] - n[1] * up[0];
  const m00 = sX,
    m01 = sY,
    m02 = sZ;
  const m10 = -up[0],
    m11 = -up[1],
    m12 = -up[2];
  const m20 = n[0],
    m21 = n[1],
    m22 = n[2];
  const tr = m00 + m11 + m22;
  let qx: number, qy: number, qz: number, qw: number;
  if (tr > 0) {
    const s = 0.5 / Math.sqrt(tr + 1);
    qw = 0.25 / s;
    qx = (m21 - m12) * s;
    qy = (m02 - m20) * s;
    qz = (m10 - m01) * s;
  } else if (m00 > m11 && m00 > m22) {
    const s = 2 * Math.sqrt(1 + m00 - m11 - m22);
    qw = (m21 - m12) / s;
    qx = 0.25 * s;
    qy = (m01 + m10) / s;
    qz = (m02 + m20) / s;
  } else if (m11 > m22) {
    const s = 2 * Math.sqrt(1 + m11 - m00 - m22);
    qw = (m02 - m20) / s;
    qx = (m01 + m10) / s;
    qy = 0.25 * s;
    qz = (m12 + m21) / s;
  } else {
    const s = 2 * Math.sqrt(1 + m22 - m00 - m11);
    qw = (m10 - m01) / s;
    qx = (m02 + m20) / s;
    qy = (m12 + m21) / s;
    qz = 0.25 * s;
  }
  return quatNorm([qx, qy, qz, qw]);
}

/**
 * Each face's snap orientation is the reference snap (face 0) composed with
 * the body-frame A4 element that maps face k → face 0 while keeping the face's
 * "up" vertex (first entry of {@link FACE_VERTEX_INDICES}) consistent.
 *
 * The element g_k satisfies σ_{g_k}(k) = 0 and σ_{g_k}(face_k_up_vertex) = 1
 * (face 0's up vertex). For k = 0 this collapses to the identity.
 */
function findA4IndexForFace(k: number): number {
  const requiredUpVertex = FACE_VERTEX_INDICES[k][0];
  for (let g = 0; g < A4_ORDER; g++) {
    const perm = A4_VERTEX_PERMUTATIONS[g];
    if (perm[k] === 0 && perm[requiredUpVertex] === 1) return g;
  }
  throw new Error(`tetrahedron: no A4 element maps face ${k} → face 0 with up preserved`);
}

const FACE_TO_A4_INDEX: readonly number[] = [0, 1, 2, 3].map(findA4IndexForFace);

const REFERENCE_SNAP: Quat = snapQuatForFace(FACE_NORMALS[0], FACE_UPS[0]);

export const SNAP_QUATERNIONS: readonly Quat[] = FACE_TO_A4_INDEX.map((g) =>
  quatNorm(quatMul(REFERENCE_SNAP, a4Quat(g))),
);

/**
 * Body-frame rotation g_{i→j} such that snap_j = snap_i · g_{i→j}.
 * Because snap_k = q_0 · a4Quat(g_k), the relative rotation collapses to a
 * pure A4 lookup: g_{i→j} = g_i⁻¹ · g_j (composed via the Cayley table).
 */
export const RELATIVE_SNAP_QUATS: readonly (readonly Quat[])[] = FACE_TO_A4_INDEX.map((gi) =>
  FACE_TO_A4_INDEX.map((gj) => a4Quat(a4Compose(a4Inverse(gi), gj))),
);

export function dominantContextIndex(q: Quat): number {
  const m = mat3FromUnitQuat(q);
  let bestZ = -Infinity;
  let bestIdx = 0;
  for (let i = 0; i < FACE_NORMALS.length; i++) {
    const z = worldZOfBodyNormal(m, FACE_NORMALS[i]);
    if (z > bestZ) {
      bestZ = z;
      bestIdx = i;
    }
  }
  return bestIdx;
}

export function nearestSnapQuat(q: Quat): Quat {
  return SNAP_QUATERNIONS[dominantContextIndex(q)];
}
