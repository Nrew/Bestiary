import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
  type PanInfo,
} from "framer-motion";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/shared/Icon";
import { CONTEXT_CONFIG } from "@/components/features/sidebar/constants";
import { APP_SHORTCUTS, formatShortcutKey } from "@/lib/keyboard-shortcuts";
import { ALL_CONTEXTS } from "@/lib/context-config";
import {
  mat3FromUnitQuat,
  quatAngle,
  quatFromAxisAngle,
  quatMul,
  quatNorm,
  quatToCSSMatrix,
  slerp,
  worldZOfBodyNormal,
  type Quat,
  type Vec3,
} from "@/lib/dice/quaternion";
import {
  dominantContextIndex,
  FACE_NORMALS,
  FACE_TRANSFORMS,
  nearestSnapQuat,
  SNAP_QUATERNIONS,
  TRIANGLE_HEIGHT_PX,
  TETRAHEDRON_EDGE_PX,
} from "@/lib/dice/tetrahedron";
import { a4Quat, A4_ORDER } from "@/lib/dice/a4Symmetry";
import { cn } from "@/lib/utils";
import type { ViewContext } from "@/types";

const FACE_GRADIENT: Record<ViewContext, string> = {
  entities:
    "linear-gradient(180deg, oklch(94% 0.035 145 / 0.5), oklch(78% 0.085 145 / 0.55))",
  items:
    "linear-gradient(180deg, oklch(95% 0.04 70 / 0.5), oklch(82% 0.09 70 / 0.55))",
  statuses:
    "linear-gradient(180deg, oklch(90% 0.045 290 / 0.5), oklch(72% 0.10 290 / 0.55))",
  abilities:
    "linear-gradient(180deg, oklch(90% 0.045 25 / 0.5), oklch(72% 0.105 25 / 0.55))",
};

const FACE_INK: Record<ViewContext, string> = {
  entities: "oklch(32% 0.11 145)",
  items: "oklch(40% 0.10 70)",
  statuses: "oklch(32% 0.13 290)",
  abilities: "oklch(32% 0.14 25)",
};

const DIAMOND_CLIP = "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)";

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

const SHADE_AMBIENT = 0.5;
const SHADE_RANGE = 1 - SHADE_AMBIENT;
const SPECULAR_PEAK = 0.4;
const SPECULAR_EXPONENT = 4;

function useFaceMotion(
  normal: Vec3,
  ink: string,
  qx: MotionValue<number>,
  qy: MotionValue<number>,
  qz: MotionValue<number>,
  qw: MotionValue<number>,
) {
  const facing = useTransform([qx, qy, qz, qw], (v) => {
    const q = [v[0], v[1], v[2], v[3]] as Quat;
    const m = mat3FromUnitQuat(q);
    return Math.max(0, worldZOfBodyNormal(m, normal));
  });
  return {
    filter: useTransform(facing, (z) => `brightness(${SHADE_AMBIENT + SHADE_RANGE * z})`),
    specularAlpha: useTransform(facing, (z) => SPECULAR_PEAK * Math.pow(z, SPECULAR_EXPONENT)),
    medallionShadow: useTransform(facing, (z) => {
      const g = z * z;
      return `0 0 ${10 + g * 16}px ${g * 4}px ${ink}, inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -1px 0 rgba(0,0,0,0.18)`;
    }),
  };
}

interface DiceTypePickerProps {
  open: boolean;
  currentContext: ViewContext;
  onOpenChange: (open: boolean) => void;
  onConfirm: (context: ViewContext) => Promise<boolean> | boolean;
}

export const DiceTypePicker: React.FC<DiceTypePickerProps> = ({
  open,
  currentContext,
  onOpenChange,
  onConfirm,
}) => {
  const initialQ = SNAP_QUATERNIONS[ALL_CONTEXTS.indexOf(currentContext)];
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
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  const [selected, setSelected] = useState<ViewContext>(currentContext);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const prefersReducedMotion = useReducedMotion();

  const stopRaf = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
  }, []);

  /**
   * Tumble / drag physics. Integrates ω·dt, damps ω, and as |ω| falls below
   * SETTLE_OMEGA blends toward the nearest snap. Chip-clicks no longer share
   * this loop — they run a dedicated one-shot slerp via {@link startSnapAnimation}.
   */
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

      q = getQuat();
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

  /**
   * One-shot eased slerp from current orientation to `target`, used for chip
   * clicks. Independent of the physics loop — finite duration, ease-out cubic,
   * always lands exactly on `target`.
   */
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
    setIsSubmitting(false);
    const target = SNAP_QUATERNIONS[ALL_CONTEXTS.indexOf(currentContext)];

    if (prefersReducedMotion) {
      stopRaf();
      omegaRef.current = [0, 0, 0];
      draggingRef.current = false;
      setQuat(target);
      return;
    }

    // Seed: a random A4 element (one of 12 tetrahedral symmetries) composed
    // with the target snap gives a "geometrically natural" starting tilt that
    // settles cleanly along an A4 orbit. Random ω drives the continuous tumble.
    const gRand = Math.floor(Math.random() * A4_ORDER);
    const seed = quatMul(a4Quat(gRand), target);
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
      const target = SNAP_QUATERNIONS[ALL_CONTEXTS.indexOf(ctx)];
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
      const dq = quatMul(
        quatFromAxisAngle([1, 0, 0], info.delta.y * DRAG_RAD_PER_PX),
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
        info.velocity.y * FLICK_OMEGA_SCALE,
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

  const handleConfirm = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const ok = await onConfirm(selected);
      if (ok) onOpenChange(false);
    } catch {
      /* onConfirm errors are surfaced by the app store; keep dialog open */
    } finally {
      setIsSubmitting(false);
    }
  }, [onConfirm, onOpenChange, selected]);

  const dieTransform = useTransform([qx, qy, qz, qw], (v) =>
    quatToCSSMatrix([v[0], v[1], v[2], v[3]] as Quat),
  );

  const faceMotion = [
    useFaceMotion(FACE_NORMALS[0], FACE_INK[ALL_CONTEXTS[0]], qx, qy, qz, qw),
    useFaceMotion(FACE_NORMALS[1], FACE_INK[ALL_CONTEXTS[1]], qx, qy, qz, qw),
    useFaceMotion(FACE_NORMALS[2], FACE_INK[ALL_CONTEXTS[2]], qx, qy, qz, qw),
    useFaceMotion(FACE_NORMALS[3], FACE_INK[ALL_CONTEXTS[3]], qx, qy, qz, qw),
  ];

  const cfg = CONTEXT_CONFIG[selected];

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => !isSubmitting && onOpenChange(next)}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-fade-in" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-[min(calc(100vw-2rem),36rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl glass-panel p-8 shadow-2xl animate-slide-up focus:outline-none motion-reduce:animate-none"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            confirmBtnRef.current?.focus();
          }}
        >
          <Dialog.Title className="sr-only">Choose an entry type</Dialog.Title>
          <Dialog.Description className="sr-only">
            Use Tab to reach the type buttons, then Enter to select. The die
            also rotates by pointer drag or flick.
          </Dialog.Description>

          <div className="mb-6 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-leather/70">
                New Draft
              </p>
              <h2 className="font-display text-2xl text-foreground">
                What will you scribe?
              </h2>
              <p className="text-xs text-muted-foreground">
                Drag or flick the die ·{" "}
                <kbd className="rounded border border-leather/20 bg-leather/10 px-1.5 py-0.5 font-mono text-[10px] text-leather">
                  {formatShortcutKey(APP_SHORTCUTS.NEW)}
                </kbd>
              </p>
            </div>
            <Dialog.Close asChild>
              <Button
                variant="ghost"
                size="icon"
                disabled={isSubmitting}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>

          <div className="flex flex-col items-center gap-5">
            <div
              className="relative mx-auto w-full max-w-104 aspect-5/4 overflow-hidden rounded-2xl bg-linear-to-b from-card/70 via-secondary/30 to-card/60 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] ring-1 ring-leather/15"
              style={{ perspective: "1000px", perspectiveOrigin: "50% 25%" }}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-1/2 h-14 w-64 -translate-x-1/2 translate-y-22"
                style={{
                  background:
                    "radial-gradient(ellipse 50% 50% at 50% 50%, oklch(18% 0.02 45 / 0.32), oklch(18% 0.02 45 / 0) 72%)",
                  filter: "blur(3px)",
                }}
              />
              <motion.div
                className={cn(
                  "absolute inset-0 touch-none select-none",
                  !prefersReducedMotion && "cursor-grab active:cursor-grabbing",
                )}
                onPanStart={onPanStart}
                onPan={onPan}
                onPanEnd={onPanEnd}
                role="img"
                aria-label={`Tetrahedral d4 — ${cfg.label} face is forward.`}
              >
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    transformStyle: "preserve-3d",
                    transform: dieTransform,
                  }}
                >
                  {ALL_CONTEXTS.map((ctx, i) => {
                    const faceCfg = CONTEXT_CONFIG[ctx];
                    const FaceIcon = faceCfg.icon;
                    return (
                      <motion.div
                        key={ctx}
                        className="absolute left-1/2 top-1/2 ring-1 ring-leather/20"
                        style={{
                          width: TETRAHEDRON_EDGE_PX,
                          height: TRIANGLE_HEIGHT_PX,
                          marginLeft: -TETRAHEDRON_EDGE_PX / 2,
                          marginTop: -(TRIANGLE_HEIGHT_PX * 2) / 3,
                          clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)",
                          transformOrigin: "50% 66.6667%",
                          transform: FACE_TRANSFORMS[i],
                          backfaceVisibility: "hidden",
                          background: FACE_GRADIENT[ctx],
                          boxShadow:
                            "inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1px 0 rgba(0,0,0,0.12)",
                          filter: faceMotion[i].filter,
                        }}
                      >
                        <motion.div
                          aria-hidden
                          className="pointer-events-none absolute inset-0"
                          style={{
                            background:
                              "radial-gradient(ellipse 75% 55% at 50% 22%, rgba(255,250,235,1) 0%, rgba(255,250,235,0) 70%)",
                            opacity: faceMotion[i].specularAlpha,
                            mixBlendMode: "screen",
                          }}
                        />
                        <Icon
                          category="dice"
                          name="d4"
                          className="pointer-events-none absolute h-40 w-40 -translate-x-1/2 -translate-y-1/2 opacity-40"
                          style={{
                            left: "50%",
                            top: "66.6667%",
                            color: FACE_INK[ctx],
                          }}
                        />
                        <motion.div
                          className="pointer-events-none absolute flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center bg-background/95 backdrop-blur-sm"
                          style={{
                            left: "50%",
                            top: "66.6667%",
                            clipPath: DIAMOND_CLIP,
                            border: `2px solid ${FACE_INK[ctx]}`,
                            boxShadow: faceMotion[i].medallionShadow,
                          }}
                        >
                          <FaceIcon
                            className={cn(
                              "h-10 w-10 drop-shadow-sm",
                              faceCfg.color,
                            )}
                            strokeWidth={1.6}
                            aria-hidden
                          />
                        </motion.div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </motion.div>
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              {ALL_CONTEXTS.map((ctx) => {
                const faceCfg = CONTEXT_CONFIG[ctx];
                const FaceIcon = faceCfg.icon;
                const isActive = selected === ctx;
                return (
                  <button
                    key={ctx}
                    type="button"
                    onClick={() => snapTo(ctx)}
                    aria-pressed={isActive}
                    className={cn(
                      "flex min-h-11 items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all",
                      isActive
                        ? "border-rune/50 bg-card/80 text-foreground shadow-sm"
                        : "border-leather/20 bg-background/40 text-muted-foreground hover:border-leather/40 hover:text-foreground",
                    )}
                  >
                    <FaceIcon
                      className={cn(
                        "h-4 w-4",
                        isActive ? faceCfg.color : "text-muted-foreground",
                      )}
                      aria-hidden="true"
                    />
                    {faceCfg.label}
                  </button>
                );
              })}
            </div>

            <p
              className="min-h-10 text-center text-sm text-muted-foreground"
              aria-live="polite"
            >
              {cfg.description}
            </p>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="justify-center border border-border hover:border-[#7a1c1c] hover:bg-[#7a1c1c]/10 transition-colors"
            >
              Cancel
            </Button>
            <Button
              ref={confirmBtnRef}
              onClick={() => void handleConfirm()}
              loading={isSubmitting}
              className="btn-codex-primary justify-center"
            >
              Create {cfg.label} Draft
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
