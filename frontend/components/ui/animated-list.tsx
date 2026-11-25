"use client"

import React, {
  useEffect,
  useMemo,
  useRef,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react"
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type MotionProps,
} from "motion/react"

import { ease } from "@/lib/motion"
import { cn } from "@/lib/utils"

/**
 * A list row. Only rows flagged as new animate on mount; existing rows stay
 * completely still while polling replaces the data. Layout changes use a
 * quiet eased transition so newly inserted rows don't shove the list around.
 */
export function AnimatedListItem({
  children,
  isNew = false,
}: {
  children: ReactNode
  isNew?: boolean
}) {
  const reduced = useReducedMotion()
  const animations: MotionProps = {
    initial: isNew && !reduced ? { opacity: 0, y: -8 } : false,
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -4 },
    transition: {
      // Critically damped: springy enough to feel alive, never bouncy.
      type: "spring",
      stiffness: 260,
      damping: 30,
      mass: 0.7,
      layout: { duration: 0.3, ease },
    },
  }

  return (
    <motion.div {...animations} layout="position" className="mx-auto w-full">
      {children}
    </motion.div>
  )
}

export interface AnimatedListProps extends ComponentPropsWithoutRef<"div"> {
  children: React.ReactNode
  /** Kept for API compatibility; no longer staggers the whole list. */
  delay?: number
}

export const AnimatedList = React.memo(
  ({ children, className, delay: _delay = 1000, ...props }: AnimatedListProps) => {
    const knownKeys = useRef<Set<string> | null>(null)
    const childrenArray = useMemo(
      () => React.Children.toArray(children),
      [children]
    )

    const entries = useMemo(
      () =>
        childrenArray.map((child, index) => {
          const childKey =
            React.isValidElement(child) && child.key != null
              ? String(child.key)
              : `row-${index}`
          return {
            child,
            key: childKey,
            isNew: knownKeys.current !== null && !knownKeys.current.has(childKey),
          }
        }),
      [childrenArray]
    )

    useEffect(() => {
      knownKeys.current = new Set(entries.map((entry) => entry.key))
    }, [entries])

    return (
      <div
        className={cn("flex flex-col items-center gap-1.5", className)}
        {...props}
      >
        <AnimatePresence initial={false}>
          {entries.map((entry) => (
            <AnimatedListItem key={entry.key} isNew={entry.isNew}>
              {entry.child}
            </AnimatedListItem>
          ))}
        </AnimatePresence>
      </div>
    )
  }
)

AnimatedList.displayName = "AnimatedList"
