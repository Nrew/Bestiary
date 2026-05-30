import type { Variants } from "framer-motion";

export const EASE_OUT = [0.25, 1, 0.5, 1] as const;

export const DURATION = {
  fast: 0.15,
  base: 0.25,
  slow: 0.4,
} as const;

export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DURATION.fast, ease: EASE_OUT } },
  exit: { opacity: 0, transition: { duration: DURATION.fast } },
};

export const slideUpVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION.base, ease: EASE_OUT } },
  exit: { opacity: 0, y: -8, transition: { duration: DURATION.base, ease: EASE_OUT } },
};

export const slideDownVariants: Variants = {
  hidden: { opacity: 0, y: -8 },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION.fast, ease: EASE_OUT } },
  exit: { opacity: 0, y: -8, transition: { duration: DURATION.fast } },
};

export const sidebarPanelVariants: Variants = {
  hidden: { x: "-100%" },
  visible: { x: 0, transition: { duration: DURATION.base, ease: EASE_OUT } },
  exit: { x: "-100%", transition: { duration: DURATION.base, ease: EASE_OUT } },
};

export const staggerContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      delayChildren: 0.05,
      staggerChildren: 0.06,
    },
  },
  exit: {
    transition: {
      staggerChildren: 0.03,
      staggerDirection: -1,
    },
  },
};

export const contentVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.base, ease: EASE_OUT },
  },
};

export type PageFlipDirection = "back" | "forward" | "direct";

const pageFlipSign = (direction: PageFlipDirection): number => {
  if (direction === "back") return -1;
  if (direction === "forward") return 1;
  return 0;
};

export const pageFlipVariants: Variants = {
  hidden: ({ direction }: { direction: PageFlipDirection }) => ({
    opacity: 0,
    x: pageFlipSign(direction) * 24,
  }),
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: DURATION.base, ease: EASE_OUT },
  },
  exit: ({ direction }: { direction: PageFlipDirection }) => ({
    opacity: 0,
    x: pageFlipSign(direction) * -24,
    transition: { duration: DURATION.fast, ease: EASE_OUT },
  }),
};

