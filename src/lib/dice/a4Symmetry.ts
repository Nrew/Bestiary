/**
 * Rotational symmetry of the regular tetrahedron: the alternating group A4
 * (order 12), realized as unit quaternions acting on body vectors v ↦ R v.
 *
 * Elements correspond to even permutations of the four vertices; each column
 * of the Cayley table is the quaternion product in Hamilton order (same as
 * {@link quatMul}).
 */
import type { Mat3RowMajor, Quat, Vec3 } from "@/lib/dice/quaternion";
import {
  IDENTITY_Q,
  mat3FromUnitQuat,
  mat3MulVec3,
  mat3ToUnitQuat,
  quatAngle,
  quatMul,
  quatNorm,
} from "@/lib/dice/quaternion";

// Canonical regular-tetrahedron vertices inside the unit cube (even-parity
// sign products). The A4 group action is invariant under uniform scale, so
// this local copy yields the same rotations as the picker's scaled mesh and
// breaks the import cycle with `tetrahedron.ts`.
const TET_VERTICES: readonly Vec3[] = [
  [1, 1, 1],
  [1, -1, -1],
  [-1, 1, -1],
  [-1, -1, 1],
];

export const A4_ORDER = 12 as const;

const EPS_MATCH = 1e-4;
const POLAR_ITERS = 40;

function permSign(p: readonly number[]): number {
  let inv = 0;
  for (let a = 0; a < 4; a++) {
    for (let b = a + 1; b < 4; b++) {
      if (p[a] > p[b]) inv++;
    }
  }
  return inv % 2 === 0 ? 1 : -1;
}

function allPerms4(): number[][] {
  const out: number[][] = [];
  const used = new Array<boolean>(4);
  const cur = new Array<number>(4);
  const dfs = (d: number) => {
    if (d === 4) {
      out.push(cur.slice());
      return;
    }
    for (let i = 0; i < 4; i++) {
      if (used[i]) continue;
      used[i] = true;
      cur[d] = i;
      dfs(d + 1);
      used[i] = false;
    }
  };
  dfs(0);
  return out;
}

const EVEN_PERMS: readonly (readonly number[])[] = allPerms4().filter((p) => permSign(p) > 0);

/** Cross-covariance ∑_k v_{p(k)} v_k^T for Kabsch / polar (yields R with R v_k = v_{p(k)}). */
function covH(verts: readonly Vec3[], p: readonly number[]): Mat3RowMajor {
  let h00 = 0,
    h01 = 0,
    h02 = 0,
    h10 = 0,
    h11 = 0,
    h12 = 0,
    h20 = 0,
    h21 = 0,
    h22 = 0;
  for (let k = 0; k < 4; k++) {
    const a = verts[p[k]];
    const b = verts[k];
    h00 += a[0] * b[0];
    h01 += a[0] * b[1];
    h02 += a[0] * b[2];
    h10 += a[1] * b[0];
    h11 += a[1] * b[1];
    h12 += a[1] * b[2];
    h20 += a[2] * b[0];
    h21 += a[2] * b[1];
    h22 += a[2] * b[2];
  }
  return [h00, h01, h02, h10, h11, h12, h20, h21, h22];
}

function frobNorm2(m: Mat3RowMajor): number {
  let s = 0;
  for (let i = 0; i < 9; i++) s += m[i] * m[i];
  return s;
}

function transpose3(m: Mat3RowMajor): Mat3RowMajor {
  return [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
}

function det3(m: Mat3RowMajor): number {
  const [a00, a01, a02, a10, a11, a12, a20, a21, a22] = m;
  return (
    a00 * (a11 * a22 - a12 * a21) - a01 * (a10 * a22 - a12 * a20) + a02 * (a10 * a21 - a11 * a20)
  );
}

function inv3(m: Mat3RowMajor): Mat3RowMajor {
  const [a00, a01, a02, a10, a11, a12, a20, a21, a22] = m;
  const det = det3(m);
  if (Math.abs(det) < 1e-18) {
    return [1, 0, 0, 0, 1, 0, 0, 0, 1];
  }
  const invDet = 1 / det;
  const b00 = a11 * a22 - a12 * a21;
  const b01 = a02 * a21 - a01 * a22;
  const b02 = a01 * a12 - a02 * a11;
  const b10 = a12 * a20 - a10 * a22;
  const b11 = a00 * a22 - a02 * a20;
  const b12 = a02 * a10 - a00 * a12;
  const b20 = a10 * a21 - a11 * a20;
  const b21 = a01 * a20 - a00 * a21;
  const b22 = a00 * a11 - a01 * a10;
  return [
    b00 * invDet,
    b01 * invDet,
    b02 * invDet,
    b10 * invDet,
    b11 * invDet,
    b12 * invDet,
    b20 * invDet,
    b21 * invDet,
    b22 * invDet,
  ];
}

function scale3(m: Mat3RowMajor, s: number): Mat3RowMajor {
  return m.map((x) => x * s) as unknown as Mat3RowMajor;
}

function add3(a: Mat3RowMajor, b: Mat3RowMajor): Mat3RowMajor {
  return a.map((x, i) => x + b[i]) as unknown as Mat3RowMajor;
}

/** Newton polar factor: orthogonal R ≈ H with det(R) = +1. */
function polarOrthogonalProcrustes(H: Mat3RowMajor): Mat3RowMajor {
  const n = Math.sqrt(frobNorm2(H));
  let X: Mat3RowMajor = n > 1e-18 ? scale3(H, 1 / n) : ([1, 0, 0, 0, 1, 0, 0, 0, 1] as unknown as Mat3RowMajor);
  for (let k = 0; k < POLAR_ITERS; k++) {
    const invXT = inv3(transpose3(X));
    X = scale3(add3(X, invXT), 0.5);
  }
  if (det3(X) < 0) {
    X = [X[0], X[1], -X[2], X[3], X[4], -X[5], X[6], X[7], -X[8]] as unknown as Mat3RowMajor;
  }
  return X;
}

function rotationMatForEvenPerm(p: readonly number[]): Mat3RowMajor {
  return polarOrthogonalProcrustes(covH(TET_VERTICES, p));
}

function canonicalQuat(q: Quat): Quat {
  const n = quatNorm(q);
  return n[3] < 0 ? [-n[0], -n[1], -n[2], -n[3]] : n;
}

/** One unit quaternion per group element (canonical w ≥ 0). */
export const A4_ROTATION_QUATS: readonly Quat[] = EVEN_PERMS.map((p) =>
  canonicalQuat(mat3ToUnitQuat(rotationMatForEvenPerm(p))),
);

/** Index of the identity element in `A4_ROTATION_QUATS`. */
export const A4_IDENTITY_INDEX = A4_ROTATION_QUATS.findIndex(
  (q) => quatAngle(q, IDENTITY_Q) < EPS_MATCH,
);

/** Even permutation σ_g with vertex k ↦ σ_g(k) for the element at index g. */
export const A4_VERTEX_PERMUTATIONS: readonly (readonly number[])[] = EVEN_PERMS;

function nearestA4Index(q: Quat): number {
  const qc = canonicalQuat(quatNorm(q));
  let best = 0;
  let bestAng = Infinity;
  for (let i = 0; i < A4_ORDER; i++) {
    const ang = quatAngle(qc, A4_ROTATION_QUATS[i]);
    if (ang < bestAng) {
      bestAng = ang;
      best = i;
    }
  }
  return best;
}

/** Cayley table: element i · j in group indices (composition as quatMul(q_i, q_j)). */
export const A4_CAYLEY: readonly (readonly number[])[] = (() => {
  const table: number[][] = [];
  for (let i = 0; i < A4_ORDER; i++) {
    const row: number[] = [];
    for (let j = 0; j < A4_ORDER; j++) {
      const comp = quatNorm(quatMul(A4_ROTATION_QUATS[i], A4_ROTATION_QUATS[j]));
      row.push(nearestA4Index(comp));
    }
    table.push(row);
  }
  return table;
})();

/** Group inverse: `A4_CAYLEY[i][A4_INVERSE[i]] === A4_IDENTITY_INDEX`. */
export const A4_INVERSE: readonly number[] = (() => {
  if (A4_IDENTITY_INDEX < 0) {
    throw new Error("a4Symmetry: identity quaternion not found in A4_ROTATION_QUATS");
  }
  const e = A4_IDENTITY_INDEX;
  return Array.from({ length: A4_ORDER }, (_, i) => {
    for (let j = 0; j < A4_ORDER; j++) {
      if (A4_CAYLEY[i][j] === e) return j;
    }
    throw new Error(`a4Symmetry: inverse missing for element ${i}`);
  });
})();

export function a4Compose(i: number, j: number): number {
  return A4_CAYLEY[i][j];
}

export function a4Inverse(i: number): number {
  return A4_INVERSE[i];
}

/** Quaternion for the group element at index i ∈ [0, 12). */
export function a4Quat(i: number): Quat {
  return A4_ROTATION_QUATS[i];
}

/** True if R_g v_k ≈ v_{σ(k)} for all vertices (numerical symmetry check). */
export function a4PermutationActsCorrectly(g: number, eps = 1e-5): boolean {
  const p = A4_VERTEX_PERMUTATIONS[g];
  const m = mat3FromUnitQuat(A4_ROTATION_QUATS[g]);
  for (let k = 0; k < 4; k++) {
    const rp = mat3MulVec3(m, TET_VERTICES[k]);
    const target = TET_VERTICES[p[k]];
    const err = Math.hypot(rp[0] - target[0], rp[1] - target[1], rp[2] - target[2]);
    if (err > eps) return false;
  }
  return true;
}
