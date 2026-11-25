/**
 * BorderBeam is intentionally disabled.
 *
 * The original Magic UI implementation relies on Tailwind v4 mask utilities
 * (`mask-*`, `mask-intersect`) which do not compile under this project's
 * Tailwind v3 setup. Without the mask, the "border" element renders as a large
 * blurred dark square travelling across panels — visible in the UI as a black
 * animation over card headers.
 *
 * The component is kept as a no-op so existing call sites remain valid. All
 * other Magic UI animations are unchanged.
 */
export interface BorderBeamProps {
  className?: string
  size?: number
  delay?: number
  duration?: number
  colorFrom?: string
  colorTo?: string
  transition?: unknown
  style?: React.CSSProperties
  reverse?: boolean
  initialOffset?: number
  borderWidth?: number
}

export function BorderBeam(_props: BorderBeamProps) {
  void _props
  return null
}
