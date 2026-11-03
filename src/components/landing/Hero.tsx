import { Component, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  AnimatePresence,
  motion,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from 'motion/react'
import { ArrowRight, Drop } from '@phosphor-icons/react'
import { Blood, Card, LinkButton, Pill } from '@/components/ui'
import { CountUp, EASE, Magnetic, Ripples } from '@/components/motion'
import type { BloodType } from '@/lib/blood'

const DropScene = lazy(() => import('./DropScene'))

const feed: { type: BloodType; title: string; place: string; ago: string; tone: 'red' | 'amber' | 'grey'; tag: string; notified: number; can: number }[] = [
  { type: 'O-', title: 'Whole blood, 3 units', place: 'AUBMC, Beirut', ago: '8 min ago', tone: 'red', tag: 'Urgent', notified: 27, can: 6 },
  { type: 'A+', title: 'Platelets, 2 units', place: 'Hôtel-Dieu, Achrafieh', ago: '31 min ago', tone: 'amber', tag: 'Within 24h', notified: 41, can: 12 },
  { type: 'B+', title: 'Whole blood, 1 unit', place: 'Rafic Hariri Hospital', ago: '1 h ago', tone: 'grey', tag: 'Fulfilled', notified: 18, can: 5 },
  { type: 'AB-', title: 'Plasma, 1 unit', place: 'Saint George, Beirut', ago: '2 min ago', tone: 'red', tag: 'Urgent', notified: 44, can: 3 },
  { type: 'O+', title: 'Whole blood, 2 units', place: 'Tripoli Government Hospital', ago: '14 min ago', tone: 'amber', tag: 'Within 24h', notified: 33, can: 9 },
]

/** WebGL can be missing or blocked. The static drop behind the canvas stays as the fallback. */
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

/** A request card that flips over in 3D whenever a new request comes in. */
function FlipCard({ n, className }: { n: number; className?: string }) {
  const d = feed[n % feed.length]
  return (
    <div className={className} style={{ perspective: 1000 }}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={n}
          initial={{ rotateX: -82, opacity: 0, y: -16 }}
          animate={{ rotateX: 0, opacity: 1, y: 0 }}
          exit={{ rotateX: 82, opacity: 0, y: 16 }}
          transition={{ duration: 0.65, ease: EASE }}
          style={{ transformOrigin: '50% 50%' }}
        >
          <Card className="p-5 shadow-lift backdrop-blur-xl [background:color-mix(in_srgb,var(--surface)_92%,transparent)]">
            <div className="flex items-center gap-3.5">
              <Blood type={d.type} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[17px] font-bold">{d.title}</div>
                <div className="truncate text-[13px] text-ink-3">
                  {d.place}, {d.ago}
                </div>
              </div>
              <Pill tone={d.tone}>{d.tag}</Pill>
            </div>
            <div className="my-3.5 h-px bg-line" />
            <div className="flex flex-wrap gap-2">
              <Pill tone="green">
                <CountUp key={n} to={d.notified} duration={1.1} /> donors notified
              </Pill>
              <Pill tone="blue">
                <CountUp key={n} to={d.can} duration={1.6} /> can donate
              </Pill>
            </div>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function HeroStage({ px, py, showFallback }: { px: MotionValue<number>; py: MotionValue<number>; showFallback: boolean }) {
  const reduce = useReducedMotion()
  const [start, setStart] = useState(0)
  const [startB, setStartB] = useState(2)
  // The two cards flip half a cycle apart so one is always readable.
  useEffect(() => {
    if (reduce) return
    const a = setInterval(() => setStart((s) => s + 1), 4200)
    let b: ReturnType<typeof setInterval> | undefined
    const delay = setTimeout(() => {
      b = setInterval(() => setStartB((s) => s + 1), 4200)
    }, 2100)
    return () => {
      clearInterval(a)
      clearTimeout(delay)
      if (b) clearInterval(b)
    }
  }, [reduce])

  // Depth layers: nearer cards travel further and tilt toward the pointer.
  const ax = useTransform(px, [-0.5, 0.5], [-30, 30])
  const ay = useTransform(py, [-0.5, 0.5], [-18, 18])
  const aRy = useTransform(px, [-0.5, 0.5], [9, -9])
  const bx = useTransform(px, [-0.5, 0.5], [18, -18])
  const by = useTransform(py, [-0.5, 0.5], [10, -10])
  const bRy = useTransform(px, [-0.5, 0.5], [-6, 6])

  return (
    <div className="relative h-[440px] sm:h-[600px]">
      {/* Static fallback, visible until WebGL has drawn its first frame */}
      <div aria-hidden className={`absolute left-1/2 top-1/2 size-[420px] -translate-x-1/2 -translate-y-1/2 transition-opacity duration-700 ${showFallback ? "opacity-100" : "opacity-0"}`}>
        <Ripples count={4} duration={6} />
        <div className="absolute inset-[34%] flex items-center justify-center rounded-full bg-brand/15 text-brand">
          <Drop weight="fill" className="size-16 opacity-50" />
        </div>
      </div>

      <motion.div style={{ x: ax, y: ay, rotateY: aRy, transformPerspective: 900 }} className="absolute right-0 top-2 hidden w-[350px] sm:block">
        <motion.div animate={reduce ? undefined : { y: [0, -10, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}>
          <FlipCard n={start} />
        </motion.div>
      </motion.div>

      <motion.div style={{ x: bx, y: by, rotateY: bRy, transformPerspective: 900 }} className="absolute bottom-0 left-0 w-[min(100%,350px)] sm:bottom-4 sm:left-2">
        <motion.div animate={reduce ? undefined : { y: [0, 8, 0] }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}>
          <FlipCard n={startB} />
        </motion.div>
      </motion.div>
    </div>
  )
}

export function Hero() {
  const ref = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()
  const active = useInView(ref, { margin: '100px' })
  const scrollRef = useRef(0)
  const [ready, setReady] = useState(false)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const { scrollY: pageY } = useScroll()
  useMotionValueEvent(pageY, 'change', (v) => {
    scrollRef.current = v
  })

  const yBlob = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 160])
  const yBlob2 = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -90])
  const px = useMotionValue(0)
  const py = useMotionValue(0)
  const headWords = ['Reach', 'the', 'right', 'donors', 'in', 'two', 'minutes.']

  return (
    <section
      ref={ref}
      onPointerMove={(e) => {
        if (reduce || e.pointerType === 'touch') return
        px.set(e.clientX / window.innerWidth - 0.5)
        py.set(e.clientY / window.innerHeight - 0.5)
      }}
      className="relative isolate flex min-h-[100dvh] items-center overflow-hidden pb-16 pt-24"
    >
      {/* Full-bleed canvas: the scene is never boxed in, so nothing clips mid-page. Soft fade at the bottom edge. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 [mask-image:linear-gradient(to_bottom,black_82%,transparent)]">
        <SceneBoundary>
          <Suspense fallback={null}>
            <DropScene eventSource={ref} scrollRef={scrollRef} animate={!reduce} active={active} cells={window.innerWidth < 640 ? 14 : 28} onReady={() => setReady(true)} />
          </Suspense>
        </SceneBoundary>
      </div>
      <motion.div aria-hidden style={{ y: yBlob }} className="absolute -left-40 -top-40 -z-10 size-[620px] rounded-full bg-brand/15 blur-[120px]" />
      <motion.div aria-hidden style={{ y: yBlob2 }} className="absolute -right-32 top-1/3 -z-10 size-[620px] rounded-full bg-brand/15 blur-[110px]" />

      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-8 px-5 lg:grid-cols-[1fr_1fr] lg:gap-4 lg:px-8">
        <div>
          <motion.div initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}>
            <Pill tone="red" className="py-1.5 pl-2.5 pr-3 text-[13px]">
              <span className="relative flex size-2">
                <span className="absolute inset-0 animate-ping rounded-full bg-brand/60 motion-reduce:animate-none" />
                <span className="relative size-2 rounded-full bg-brand" />
              </span>
              14 urgent requests open in Lebanon
            </Pill>
          </motion.div>

          <h1 className="mt-6 max-w-[19ch] text-[2.5rem] font-extrabold leading-[1.04] tracking-tighter sm:text-5xl lg:text-[3.6rem]" aria-label={headWords.join(' ')}>
            {headWords.map((w, i) => (
              <span key={i} className="inline-block overflow-hidden pb-1.5 align-bottom" aria-hidden>
                <motion.span
                  className={w === 'donors' ? 'inline-block text-brand' : 'inline-block'}
                  initial={reduce ? false : { y: '110%', rotateX: -60 }}
                  animate={{ y: 0, rotateX: 0 }}
                  transition={{ duration: 0.9, delay: 0.15 + i * 0.07, ease: EASE }}
                >
                  {w}&nbsp;
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p
            className="mt-6 max-w-[48ch] text-lg leading-relaxed text-ink-2"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.85, ease: EASE }}
          >
            Hospitals post a request. Matching donors nearby get a WhatsApp message and answer with one tap.
          </motion.p>

          <motion.div
            className="mt-8 flex flex-wrap items-center gap-3"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 1, ease: EASE }}
          >
            <Magnetic>
              <LinkButton to="/join" size="lg">
                Become a donor <ArrowRight weight="bold" className="size-5" />
              </LinkButton>
            </Magnetic>
            <Magnetic>
              <LinkButton to="/login" variant="ghost" size="lg" className="bg-surface/80 backdrop-blur">
                Post a request
              </LinkButton>
            </Magnetic>
          </motion.div>
        </div>

        <motion.div initial={reduce ? false : { opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.2, delay: 0.4, ease: EASE }}>
          <HeroStage px={px} py={py} showFallback={!ready} />
        </motion.div>
      </div>
    </section>
  )
}
