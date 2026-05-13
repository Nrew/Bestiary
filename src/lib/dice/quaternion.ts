export type Vec3 = readonly [number, number, number];
/** Quaternion (x, y, z, w), Hamilton convention, active rotation of column vectors. */
export type Quat = readonly [number, number, number, number];

export const IDENTITY_Q: Quat = [0, 0, 0, 1];

/** Row-major 3×3 rotation matrix: v' = R v for column vectors v. */
export type Mat3RowMajor = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

export function quatMul(a: Quat, b: Quat): Quat {
  return [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
  ];
}

export function quatNorm(q: Quat): Quat {
  const m = Math.hypot(q[0], q[1], q[2], q[3]);
  if (m < 1e-12) return IDENTITY_Q;
  return [q[0] / m, q[1] / m, q[2] / m, q[3] / m];
}

/** Inverse of a unit quaternion (its conjugate). */
export function quatInverse(q: Quat): Quat {
  return [-q[0], -q[1], -q[2], q[3]];
}

export function quatFromAxisAngle(axis: Vec3, angleRad: number): Quat {
  const al = Math.hypot(axis[0], axis[1], axis[2]);
  if (al < 1e-12 || Math.abs(angleRad) < 1e-12) return IDENTITY_Q;
  const ha = angleRad * 0.5;
  const s = Math.sin(ha) / al;
  return [axis[0] * s, axis[1] * s, axis[2] * s, Math.cos(ha)];
}

export function quatAngle(a: Quat, b: Quat): number {
  const d = Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]);
  return 2 * Math.acos(Math.min(1, d));
}

export function slerp(a: Quat, b: Quat, t: number): Quat {
  let dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  let b0 = b[0],
    b1 = b[1],
    b2 = b[2],
    b3 = b[3];
  if (dot < 0) {
    dot = -dot;
    b0 = -b0;
    b1 = -b1;
    b2 = -b2;
    b3 = -b3;
  }
  if (dot > 0.9995) {
    return quatNorm([
      a[0] + t * (b0 - a[0]),
      a[1] + t * (b1 - a[1]),
      a[2] + t * (b2 - a[2]),
      a[3] + t * (b3 - a[3]),
    ]);
  }
  const omega = Math.acos(Math.min(1, dot));
  const sinO = Math.sin(omega);
  const w1 = Math.sin((1 - t) * omega) / sinO;
  const w2 = Math.sin(t * omega) / sinO;
  return [w1 * a[0] + w2 * b0, w1 * a[1] + w2 * b1, w1 * a[2] + w2 * b2, w1 * a[3] + w2 * b3];
}

export function mat3FromUnitQuat(q: Quat): Mat3RowMajor {
  const x = q[0],
    y = q[1],
    z = q[2],
    w = q[3];
  const xx = x * x,
    yy = y * y,
    zz = z * z;
  const xy = x * y,
    xz = x * z,
    yz = y * z;
  const wx = w * x,
    wy = w * y,
    wz = w * z;
  const r00 = 1 - 2 * (yy + zz),
    r01 = 2 * (xy - wz),
    r02 = 2 * (xz + wy);
  const r10 = 2 * (xy + wz),
    r11 = 1 - 2 * (xx + zz),
    r12 = 2 * (yz - wx);
  const r20 = 2 * (xz - wy),
    r21 = 2 * (yz + wx),
    r22 = 1 - 2 * (xx + yy);
  return [r00, r01, r02, r10, r11, r12, r20, r21, r22];
}

/** World +Z component of body-fixed unit normal n under rotation q (same as rotateVecByQuat(n,q)[2]). */
export function worldZOfBodyNormal(m: Mat3RowMajor, n: Vec3): number {
  return m[6] * n[0] + m[7] * n[1] + m[8] * n[2];
}

export function quatToCSSMatrix(q: Quat): string {
  const m = mat3FromUnitQuat(q);
  return `matrix3d(${m[0]},${m[3]},${m[6]},0,${m[1]},${m[4]},${m[7]},0,${m[2]},${m[5]},${m[8]},0,0,0,0,1)`;
}

/** Column-vector map v' = M v; M is row-major (same layout as mat3FromUnitQuat). */
export function mat3MulVec3(m: Mat3RowMajor, v: Vec3): Vec3 {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ];
}

/**
 * Unit quaternion for a proper rotation matrix (row-major, det(M) ≈ +1).
 * Shepperd's method; stable branch on trace / diagonal dominance.
 * Inverse of {@link mat3FromUnitQuat}.
 */
export function mat3ToUnitQuat(m: Mat3RowMajor): Quat {
  const r00 = m[0], r01 = m[1], r02 = m[2];
  const r10 = m[3], r11 = m[4], r12 = m[5];
  const r20 = m[6], r21 = m[7], r22 = m[8];
  const tr = r00 + r11 + r22;
  let qx: number, qy: number, qz: number, qw: number;
  if (tr > 0) {
    const s = 0.5 / Math.sqrt(tr + 1);
    qw = 0.25 / s;
    qx = (r21 - r12) * s;
    qy = (r02 - r20) * s;
    qz = (r10 - r01) * s;
  } else if (r00 > r11 && r00 > r22) {
    const s = 2 * Math.sqrt(1 + r00 - r11 - r22);
    qw = (r21 - r12) / s;
    qx = 0.25 * s;
    qy = (r01 + r10) / s;
    qz = (r02 + r20) / s;
  } else if (r11 > r22) {
    const s = 2 * Math.sqrt(1 + r11 - r00 - r22);
    qw = (r02 - r20) / s;
    qx = (r01 + r10) / s;
    qy = 0.25 * s;
    qz = (r12 + r21) / s;
  } else {
    const s = 2 * Math.sqrt(1 + r22 - r00 - r11);
    qw = (r10 - r01) / s;
    qx = (r02 + r20) / s;
    qy = (r12 + r21) / s;
    qz = 0.25 * s;
  }
  return quatNorm([qx, qy, qz, qw]);
}
