"use client"

import { useEffect, useRef, type ComponentPropsWithoutRef } from "react"
import { animate, useInView, useMotionValue, useReducedMotion } from "motion/react"

import { ease } from "@/lib/motion"
import { cn } from "@/lib/utils"

interface NumberTickerProps extends ComponentPropsWithoutRef<"span"> {
  value: number
  startValue?: number
  direction?: "up" | "down"
  delay?: number
  decimalPlaces?: number
  /** Seconds. Kept short so a polling refresh never feels like a slot machine. */
  duration?: number
}

export function NumberTicker({
  value,
  startValue = 0,
  direction = "up",
  delay = 0,
  duration: tickDuration = 0.9,
  decimalPlaces = 0,
  className,
  ...props
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const reduced = useReducedMotion()
  const motionValue = useMotionValue(direction === "down" ? value : startValue)
  const isInView = useInView(ref, { once: true, margin: "0px" })

  const format = (latest: number) =>
    new Intl.NumberFormat("en-US", {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    }).format(Number(latest.toFixed(decimalPlaces)))

  useEffect(() => {
    const target = direction === "down" ? startValue : value
    if (!isInView) return

    if (reduced) {
      motionValue.set(target)
      if (ref.current) ref.current.textContent = format(target)
      return
    }

    const controls = animate(motionValue, target, {
      duration: Math.min(tickDuration, 1),
      delay,
      ease,
    })
    return () => controls.stop()
    // `duration` is the shared motion default unless explicitly overridden.
  }, [motionValue, isInView, delay, value, direction, startValue, tickDuration, reduced, decimalPlaces])

  useEffect(
    () =>
      motionValue.on("change", (latest) => {
        if (ref.current) ref.current.textContent = format(latest)
      }),
    [motionValue, decimalPlaces]
  )

  return (
    <span
      ref={ref}
      className={cn(
        "inline-block tracking-wider text-black tabular-nums dark:text-white",
        className
      )}
      {...props}
    >
      {format(startValue)}
    </span>
  )
}
