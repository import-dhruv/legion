import type { Easing, Transition, Variants } from "motion/react";

/**
 * Shared motion language for the whole control plane.
 *
 * One short, decelerating curve, one moderate duration and one small stagger.
 * Nothing here bounces or overshoots: the interface should feel deliberate,
 * never springy or noisy.
 */
export const ease: Easing = [0.22, 1, 0.36, 1];
export const duration = 0.45;
export const stagger = 0.045;

export const transition: Transition = { duration, ease };

/** Quiet, blur-assisted entrance used by Reveal and page sections. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12, filter: "blur(6px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.5, ease },
  },
};

/** Smaller entrance for popovers, tab panels and compact surfaces. */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.985 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.35, ease } },
};

/** Parent variant for grids / lists of entrances. */
export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: stagger, delayChildren: 0.02 } },
};

/** Shared hover state: a two-pixel rise and a slightly deeper shadow. */
export const hoverLift: Variants = {
  hover: {
    y: -2,
    boxShadow: "0 12px 30px -18px rgba(0, 0, 0, 0.38)",
    transition: { duration: 0.22, ease },
  },
};

/** Shared press state: a subtle, non-bouncy compression. */
export const tap: Variants = {
  tap: { scale: 0.985, transition: { duration: 0.12, ease } },
};

/** Viewport settings shared by every in-view reveal. */
export const revealViewport = { once: true, margin: "-40px" } as const;
