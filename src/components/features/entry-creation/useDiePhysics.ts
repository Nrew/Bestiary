import { useCallback, useEffect, useRef, useState } from "react";
import {
  useMotionValue,
  useReducedMotion,
  type MotionValue,
  type PanInfo,
} from "framer-motion";
import {
  quatAngle,
  quatFromAxisAngle,
  quatMul,
  quatNorm,
  slerp,
  type Quat,
  type Vec3,
} from "@/lib/dice/quaternion";
import {
  dominantContextIndex,
  nearestSnapQuat,
  SNAP_QUATERNIONS,
} from "@/lib/dice/tetrahedron";
import { a4Compose, a4Quat, A4_ORDER } from "@/lib/dice/a4Symmetry";
import { ALL_CONTEXTS } from "@/lib/context-config";
import type { ViewContext } from "@/types";

function snapQuatForContext(ctx: ViewContext): Quat {
  const idx = ALL_CONTEXTS.indexOf(ctx);
  if (idx < 0) {
    throw new Error(`useDiePhysics: unknown ViewContext "${String(ctx)}"`);
  }
  return SNAP_QUATERNIONS[idx];
}

const DRAG_RAD_PER_PX = 0.0085;
const FLICK_OMEGA_SCALE = 0.0028;
const MAX_OMEGA = 22;
const ANG_DECEL = 5.6;
const LINEAR_DRAG = 1.3;
const SETTLE_OMEGA = 1.6;
const SETTLE_PULL_RATE = 7.5;
const EPS_OMEGA = 1e-4;
const EPS_ANGLE = 0.0015;
const MAX_FRAME_DT_S = 0.04;
/** Duration of the one-shot chip-click slerp animation (ms). */
const SNAP_ANIMATION_MS = 320;

export interface DiePhysicsState {
  qx: MotionValue<number>;
  qy: MotionValue<number>;
  qz: MotionValue<number>;
  qw: MotionValue<number>;
  selected: ViewContext;
  prefersReducedMotion: boolean | null;
  snapTo: (ctx: ViewContext) => void;
  onPanStart: () => void;
  onPan: (event: PointerEvent, info: PanInfo) => void;
  onPanEnd: (event: PointerEvent, info: PanInfo) => void;
}

/**
 * Tetrahedral d4 physics: quaternion motion values, drag/flick integration,
 * angular damping, and snap-on-settle. Chip clicks bypass the physics loop
 * via a dedicated eased slerp.
 */
export function useDiePhysics(open: boolean, currentContext: ViewContext): DiePhysicsState {
  const initialQ = snapQuatForContext(currentContext);
  const qx = useMotionValue(initialQ[0]);
  const qy = useMotionValue(initialQ[1]);
  const qz = useMotionValue(initialQ[2]);
  const qw = useMotionValue(initialQ[3]);

  const getQuat = useCallback(
    (): Quat => [qx.get(), qy.get(), qz.get(), qw.get()],
    [qx, qy, qz, qw],
  );
  const setQuat = useCallback(
    (q: Quat) => {
      const n = quatNorm(q);
      qx.set(n[0]);
      qy.set(n[1]);
      qz.set(n[2]);
      qw.set(n[3]);
    },
    [qx, qy, qz, qw],
  );

  const omegaRef = useRef<Vec3>([0, 0, 0]);
  const rafRef = useRef(0);
  const draggingRef = useRef(false);

  const [selected, setSelected] = useState<ViewContext>(currentContext);
  const prefersReducedMotion = useReducedMotion();

  const stopRaf = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
  }, []);

  // Integrates ω·dt, damps ω, blends toward nearest snap as |ω| → 0.
  const startPhysics = useCallback(() => {
    stopRaf();
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(MAX_FRAME_DT_S, (now - last) / 1000);
      last = now;

      const omega = omegaRef.current;
      const speed = Math.hypot(omega[0], omega[1], omega[2]);

      let q = getQuat();
      if (speed > EPS_OMEGA) {
        const dq = quatFromAxisAngle(
          [omega[0] / speed, omega[1] / speed, omega[2] / speed],
          speed * dt,
        );
        q = quatNorm(quatMul(dq, q));
        setQuat(q);
      }

      const speedNext = Math.max(0, speed - (ANG_DECEL + LINEAR_DRAG * speed) * dt);
      if (speedNext < EPS_OMEGA) {
        omegaRef.current = [0, 0, 0];
      } else if (speed > 0) {
        const k = speedNext / speed;
        omegaRef.current = [omega[0] * k, omega[1] * k, omega[2] * k];
      }

      const target = nearestSnapQuat(q);
      const angleToTarget = quatAngle(q, target);

      const pullSpeedBlend = Math.max(0, 1 - speedNext / SETTLE_OMEGA);
      if (pullSpeedBlend > 0) {
        const k = pullSpeedBlend * (1 - Math.exp(-SETTLE_PULL_RATE * dt));
        if (k > 0) {
          q = slerp(q, target, k);
          setQuat(q);
        }
      }

      if (speedNext < EPS_OMEGA && angleToTarget < EPS_ANGLE) {
        setQuat(target);
        setSelected(ALL_CONTEXTS[dominantContextIndex(target)]);
        omegaRef.current = [0, 0, 0];
        rafRef.current = 0;
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [getQuat, setQuat, stopRaf]);

  /** One-shot eased slerp from current orientation to `target` (chip-click path). */
  const startSnapAnimation = useCallback(
    (target: Quat) => {
      stopRaf();
      const start = getQuat();
      const startTime = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - startTime) / SNAP_ANIMATION_MS);
        const eased = 1 - (1 - t) * (1 - t) * (1 - t);
        setQuat(slerp(start, target, eased));
        if (t < 1) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }
        setQuat(target);
        rafRef.current = 0;
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    [getQuat, setQuat, stopRaf],
  );

  useEffect(() => {
    if (!open) return;
    setSelected(currentContext);
    const target = snapQuatForContext(currentContext);

    if (prefersReducedMotion) {
      stopRaf();
      omegaRef.current = [0, 0, 0];
      draggingRef.current = false;
      setQuat(target);
      return;
    }

    // Compose two random A4 elements (still A4 by closure) for a more uniform
    // distribution over the 12 starting orientations than one raw index.
    const g1 = Math.floor(Math.random() * A4_ORDER);
    const g2 = Math.floor(Math.random() * A4_ORDER);
    const gSeed = a4Compose(g1, g2);
    const seed = quatMul(a4Quat(gSeed), target);
    setQuat(seed);

    omegaRef.current = [
      (Math.random() - 0.5) * 12,
      (Math.random() - 0.5) * 14,
      (Math.random() - 0.5) * 6,
    ];
    draggingRef.current = false;
    startPhysics();

    return () => stopRaf();
  }, [open, currentContext, prefersReducedMotion, setQuat, startPhysics, stopRaf]);

  const snapTo = useCallback(
    (ctx: ViewContext) => {
      const target = snapQuatForContext(ctx);
      setSelected(ctx);
      omegaRef.current = [0, 0, 0];
      draggingRef.current = false;
      if (prefersReducedMotion) {
        stopRaf();
        setQuat(target);
        return;
      }
      startSnapAnimation(target);
    },
    [startSnapAnimation, prefersReducedMotion, setQuat, stopRaf],
  );

  const onPanStart = useCallback(() => {
    if (prefersReducedMotion) return;
    stopRaf();
    omegaRef.current = [0, 0, 0];
    draggingRef.current = true;
  }, [prefersReducedMotion, stopRaf]);

  const onPan = useCallback(
    (_: PointerEvent, info: PanInfo) => {
      if (!draggingRef.current) return;
      // CSS +Y is down; negate Δy so drag-down rotates the face downward.
      const dq = quatMul(
        quatFromAxisAngle([1, 0, 0], -info.delta.y * DRAG_RAD_PER_PX),
        quatFromAxisAngle([0, 1, 0], info.delta.x * DRAG_RAD_PER_PX),
      );
      const next = quatMul(dq, getQuat());
      setQuat(next);
      setSelected(ALL_CONTEXTS[dominantContextIndex(next)]);
    },
    [getQuat, setQuat],
  );

  const onPanEnd = useCallback(
    (_: PointerEvent, info: PanInfo) => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      const omega: Vec3 = [
        -info.velocity.y * FLICK_OMEGA_SCALE,
        info.velocity.x * FLICK_OMEGA_SCALE,
        0,
      ];
      const mag = Math.hypot(omega[0], omega[1], omega[2]);
      if (mag > MAX_OMEGA) {
        const s = MAX_OMEGA / mag;
        omegaRef.current = [omega[0] * s, omega[1] * s, omega[2] * s];
      } else {
        omegaRef.current = omega;
      }
      startPhysics();
    },
    [startPhysics],
  );

  return { qx, qy, qz, qw, selected, prefersReducedMotion, snapTo, onPanStart, onPan, onPanEnd };
}
