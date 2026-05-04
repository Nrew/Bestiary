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

export const staggerContainerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

export const contentVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION.slow, ease: EASE_OUT } },
};

export const burnVariants: Variants = {
  hidden: { opacity: 0, scale: 0.92, filter: "brightness(1.8) sepia(1) saturate(4) blur(2px)" },
  visible: { opacity: 1, scale: 1, filter: "brightness(1) sepia(0) saturate(1) blur(0px)", transition: { duration: DURATION.fast, ease: EASE_OUT } },
};

export const sidebarPanelVariants: Variants = {
  hidden: { x: "-100%" },
  visible: { x: 0, transition: { duration: DURATION.base, ease: EASE_OUT } },
  exit: { x: "-100%", transition: { duration: DURATION.base, ease: EASE_OUT } },
};

export const headerSlideLeft: Variants = {
  hidden: { opacity: 0, x: -16 },
  visible: { opacity: 1, x: 0, transition: { duration: DURATION.slow, ease: EASE_OUT } },
};

export const headerSlideRight: Variants = {
  hidden: { opacity: 0, x: 16 },
  visible: { opacity: 1, x: 0, transition: { duration: DURATION.slow, ease: EASE_OUT, delay: 0.05 } },
};
