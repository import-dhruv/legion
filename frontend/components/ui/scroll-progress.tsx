"use client"

import { motion, useReducedMotion, useScroll, useSpring, type MotionProps } from "motion/react"

import { cn } from "@/lib/utils"

interface ScrollProgressProps extends Omit<
  React.HTMLAttributes<HTMLElement>,
  keyof MotionProps
> {
  ref?: React.Ref<HTMLDivElement>
}

export function ScrollProgress({
  className,
  ref,
  ...props
}: ScrollProgressProps) {
  const { scrollYProgress } = useScroll()
  const reduced = useReducedMotion()
  // Spring-smoothed width: no layout thrash, no jumpy segments.
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 220,
    damping: 30,
    mass: 0.4,
    restDelta: 0.001,
  })

  return (
    <motion.div
      ref={ref}
      className={cn(
        "fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-gradient-to-r from-foreground via-foreground/60 to-foreground",
        className
      )}
      style={{ scaleX: reduced ? scrollYProgress : smoothProgress }}
      {...props}
    />
  )
}
