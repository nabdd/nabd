import { useEffect, useRef, type ReactNode } from 'react'
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'motion/react'
import { cn } from '@/lib/cn'

export const EASE = [0.16, 1, 0.3, 1] as const

/** Fade + rise when scrolled into view. Hierarchy: draws the eye in reading order. */
export function Reveal({
  children,
  delay = 0,
  y = 28,
  className,
  as = 'div',
}: {
  children: ReactNode
  delay?: number
  y?: number
  className?: string
  as?: 'div' | 'li' | 'section'
}) {
  const reduce = useReducedMotion()
  const M = motion[as]
  return (
    <M
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.7, delay, ease: EASE }}
    >
      {children}
    </M>
  )
}

/** Counts up from 0 when first visible. Uses motion values so React never re-renders per frame. */
export function CountUp({
  to,
  duration = 1.6,
  decimals = 0,
  className,
  format,
}: {
  to: number
  duration?: number
  decimals?: number
  className?: string
  format?: (n: number) => string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.6 })
  const reduce = useReducedMotion()
  const v = useMotionValue(reduce ? to : 0)
  const fmt = (n: number) => (format ? format(n) : n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }))
  useMotionValueEvent(v, 'change', (n) => {
    if (ref.current) ref.current.textContent = fmt(n)
  })
  useEffect(() => {
    if (!inView || reduce) return
    const c = animate(v, to, { duration, ease: EASE })
    return () => c.stop()
  }, [inView, to, duration, reduce, v])
  return (
    <span ref={ref} className={className}>
      {fmt(reduce ? to : 0)}
    </span>
  )
}

/** Magnetic hover: wrapped element drifts toward the cursor. Physics only, no state. */
export function Magnetic({ children, strength = 0.25, className }: { children: ReactNode; strength?: number; className?: string }) {
  const reduce = useReducedMotion()
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 220, damping: 18 })
  const sy = useSpring(y, { stiffness: 220, damping: 18 })
  return (
    <motion.div
      className={cn('inline-block', className)}
      style={{ x: sx, y: sy }}
      onPointerMove={(e) => {
        if (reduce || e.pointerType === 'touch') return
        const r = e.currentTarget.getBoundingClientRect()
        x.set((e.clientX - (r.left + r.width / 2)) * strength)
        y.set((e.clientY - (r.top + r.height / 2)) * strength)
      }}
      onPointerLeave={() => {
        x.set(0)
        y.set(0)
      }}
    >
      {children}
    </motion.div>
  )
}

/** Tilt card that follows the pointer in 3D. */
export function Tilt({ children, className, max = 7 }: { children: ReactNode; className?: string; max?: number }) {
  const reduce = useReducedMotion()
  const px = useMotionValue(0.5)
  const py = useMotionValue(0.5)
  const rx = useSpring(useTransform(py, [0, 1], [max, -max]), { stiffness: 160, damping: 18 })
  const ry = useSpring(useTransform(px, [0, 1], [-max, max]), { stiffness: 160, damping: 18 })
  return (
    <motion.div
      className={className}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      onPointerMove={(e) => {
        if (reduce || e.pointerType === 'touch') return
        const r = e.currentTarget.getBoundingClientRect()
        px.set((e.clientX - r.left) / r.width)
        py.set((e.clientY - r.top) / r.height)
      }}
      onPointerLeave={() => {
        px.set(0.5)
        py.set(0.5)
      }}
    >
      {children}
    </motion.div>
  )
}

/** Concentric pulse rings. Communicates "broadcast radiating outward". */
export function Ripples({ className, count = 4, duration = 5 }: { className?: string; count?: number; duration?: number }) {
  return (
    <div aria-hidden className={cn('pointer-events-none absolute inset-0', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="absolute inset-0 rounded-full border border-brand/40"
          style={{ animation: `ripple ${duration}s ${(i * duration) / count}s cubic-bezier(0.16,1,0.3,1) infinite` }}
        />
      ))}
    </div>
  )
}
