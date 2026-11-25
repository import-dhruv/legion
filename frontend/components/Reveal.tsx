"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import type { ReactNode } from "react";
import {
  duration,
  ease,
  fadeUp,
  hoverLift,
  revealViewport,
  scaleIn,
  staggerContainer,
  tap,
} from "@/lib/motion";
import { cn } from "@/lib/utils";

type RevealVariant = "fadeUp" | "scaleIn" | "stagger";

export const revealVariants: Record<RevealVariant, Variants> = {
  fadeUp,
  scaleIn,
  stagger: staggerContainer,
};

/**
 * Standard entrance wrapper. Unlike ad-hoc `BlurFade delay={...}` values,
 * every reveal uses the same duration/easing and only animates the first time
 * it enters the viewport. `interactive` opts a surface into the shared
 * hover-lift / press states.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  variant = "fadeUp",
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  variant?: RevealVariant;
  interactive?: boolean;
}) {
  const reduced = useReducedMotion();
  const base = revealVariants[variant];
  const variants: Variants = interactive
    ? { ...base, ...hoverLift, ...tap }
    : base;

  // Same DOM shape on server and client; only animation props differ.
  return (
    <motion.div
      className={cn(interactive && "will-change-transform", className)}
      initial={reduced ? false : "hidden"}
      whileInView={reduced ? undefined : "visible"}
      animate={reduced ? "visible" : undefined}
      viewport={revealViewport}
      variants={variants}
      whileHover={reduced || !interactive ? undefined : "hover"}
      whileTap={reduced || !interactive ? undefined : "tap"}
      transition={{ duration: reduced ? 0 : duration, delay: reduced ? 0 : delay, ease }}
    >
      {children}
    </motion.div>
  );
}
