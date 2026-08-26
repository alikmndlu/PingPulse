import type { Transition } from "motion/react";

/** macOS / iOS deceleration — fast start, long settle. */
export const appleEase = [0.16, 1, 0.3, 1] as const;

export const duration = {
  instant: 0.14,
  fast: 0.22,
  base: 0.38,
  slow: 0.56,
} as const;

export const spring: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 32,
  mass: 0.78,
};

export const springSoft: Transition = {
  type: "spring",
  stiffness: 280,
  damping: 34,
  mass: 0.9,
};

export const tween = (ms: keyof typeof duration = "base"): Transition => ({
  duration: duration[ms],
  ease: appleEase,
});
