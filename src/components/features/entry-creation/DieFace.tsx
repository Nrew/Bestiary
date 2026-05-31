import { motion, useTransform, type MotionValue } from "framer-motion";
import { Icon } from "@/components/shared/Icon";
import { CONTEXT_CONFIG } from "@/components/features/sidebar/constants";
import {
  mat3FromUnitQuat,
  worldZOfBodyNormal,
  type Quat,
  type Vec3,
} from "@/lib/dice/quaternion";
import {
  FACE_NORMALS,
  FACE_TRANSFORMS,
  TRIANGLE_HEIGHT_PX,
  TETRAHEDRON_EDGE_PX,
} from "@/lib/dice/tetrahedron";
import type { ViewContext } from "@/types";
import { cn } from "@/lib/utils";

const FACE_GRADIENT: Record<ViewContext, string> = {
  entities:
    "linear-gradient(180deg, var(--color-die-entities-tint), var(--color-die-entities-deep))",
  items:
    "linear-gradient(180deg, var(--color-die-items-tint), var(--color-die-items-deep))",
  statuses:
    "linear-gradient(180deg, var(--color-die-statuses-tint), var(--color-die-statuses-deep))",
  abilities:
    "linear-gradient(180deg, var(--color-die-abilities-tint), var(--color-die-abilities-deep))",
};

const FACE_INK: Record<ViewContext, string> = {
  entities: "var(--color-die-entities-ink)",
  items: "var(--color-die-items-ink)",
  statuses: "var(--color-die-statuses-ink)",
  abilities: "var(--color-die-abilities-ink)",
};

const DIAMOND_CLIP = "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)";

const SHADE_AMBIENT = 0.5;
const SHADE_RANGE = 1 - SHADE_AMBIENT;
const SPECULAR_PEAK = 0.4;
const SPECULAR_EXPONENT = 4;

interface DieFaceProps {
  ctx: ViewContext;
  faceIndex: number;
  qx: MotionValue<number>;
  qy: MotionValue<number>;
  qz: MotionValue<number>;
  qw: MotionValue<number>;
}

/**
 * One triangular face of the d4. Derives view-space lighting (ambient + specular)
 * from the parent's quaternion motion values so the face brightens as it rotates
 * toward the camera.
 */
export function DieFace({ ctx, faceIndex, qx, qy, qz, qw }: DieFaceProps) {
  const normal: Vec3 = FACE_NORMALS[faceIndex];
  const ink = FACE_INK[ctx];
  const faceCfg = CONTEXT_CONFIG[ctx];
  const FaceIcon = faceCfg.icon;

  const facing = useTransform([qx, qy, qz, qw], (v) => {
    const q = [v[0], v[1], v[2], v[3]] as Quat;
    const m = mat3FromUnitQuat(q);
    return Math.max(0, worldZOfBodyNormal(m, normal));
  });
  const filter = useTransform(facing, (z) => `brightness(${SHADE_AMBIENT + SHADE_RANGE * z})`);
  const specularAlpha = useTransform(facing, (z) => SPECULAR_PEAK * Math.pow(z, SPECULAR_EXPONENT));
  const medallionShadow = useTransform(facing, (z) => {
    const g = z * z;
    return `0 0 ${10 + g * 16}px ${g * 4}px ${ink}, inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -1px 0 oklch(18% 0.01 45 / 0.18)`;
  });

  return (
    <motion.div
      className="absolute left-1/2 top-1/2 ring-1 ring-leather/20"
      style={{
        width: TETRAHEDRON_EDGE_PX,
        height: TRIANGLE_HEIGHT_PX,
        marginLeft: -TETRAHEDRON_EDGE_PX / 2,
        marginTop: -(TRIANGLE_HEIGHT_PX * 2) / 3,
        clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)",
        transformOrigin: "50% 66.6667%",
        transform: FACE_TRANSFORMS[faceIndex],
        backfaceVisibility: "hidden",
        background: FACE_GRADIENT[ctx],
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1px 0 oklch(18% 0.01 45 / 0.12)",
        filter,
      }}
    >
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 75% 55% at 50% 22%, rgba(255,250,235,1) 0%, rgba(255,250,235,0) 70%)",
          opacity: specularAlpha,
          mixBlendMode: "screen",
        }}
      />
      <Icon
        category="dice"
        name="d4"
        className="pointer-events-none absolute h-40 w-40 -translate-x-1/2 -translate-y-1/2 opacity-40"
        style={{ left: "50%", top: "66.6667%", color: ink }}
      />
      <motion.div
        className="pointer-events-none absolute flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center bg-background/95 backdrop-blur-sm"
        style={{
          left: "50%",
          top: "66.6667%",
          clipPath: DIAMOND_CLIP,
          border: `2px solid ${ink}`,
          boxShadow: medallionShadow,
        }}
      >
        <FaceIcon
          className={cn("h-10 w-10 drop-shadow-sm", faceCfg.color)}
          strokeWidth={1.6}
          aria-hidden="true"
        />
      </motion.div>
    </motion.div>
  );
}
