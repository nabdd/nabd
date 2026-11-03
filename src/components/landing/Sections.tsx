import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useInView, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react'
import {
  ArrowRight,
  CalendarCheck,
  ClipboardText,
  Drop,
  Lock,
  Minus,
  PauseCircle,
  Plus,
  ShieldCheck,
  UsersThree,
  WhatsappLogo,
} from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { Avatar, Blood, Card, LinkButton, Logo, Pill } from '@/components/ui'
import { CountUp, EASE, Magnetic, Reveal, Ripples } from '@/components/motion'
import { BrowserFrame, Phone, WhatsAppChat } from '@/components/WhatsAppChat'
import { DonorProfileView } from '@/pages/DonorProfile'
import { BLOOD_TYPES, CAN_RECEIVE_FROM, fmtType, type BloodType } from '@/lib/blood'
import { matchDonors, typeCounts } from '@/data/mock'
import { cn } from '@/lib/cn'
import { ThemeToggle } from './Nav'

/* ================= Stats ================= */
export function Stats() {
  const items = [
    { to: 8420, label: 'Registered donors', fmt: undefined },
    { to: 1236, label: 'Requests fulfilled', fmt: undefined },
    { to: 11, label: 'Average first response', fmt: (n: number) => `${Math.round(n)} min` },
  ]
  return (
    <section className="border-y border-line bg-surface">
      <div className="mx-auto grid max-w-7xl divide-y divide-line px-5 md:grid-cols-3 md:divide-x md:divide-y-0 lg:px-8">
        {items.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.1} className="px-0 py-10 md:px-10 md:py-14 md:first:pl-0 md:last:pr-0">
            <CountUp to={s.to} format={s.fmt} className="block text-5xl font-extrabold tracking-tighter tabular-nums sm:text-6xl" />
            <div className="mt-2 text-[15px] text-ink-2">{s.label}</div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

/* ================= How it works (scroll-driven) ================= */
const steps = [
  { icon: ClipboardText, title: 'Hospital posts a request', body: 'Blood type, component, units, urgency and location. It takes 30 seconds.' },
  { icon: UsersThree, title: 'Nabd finds matching donors', body: 'Compatible type, inside your radius, and eligible since their last donation.' },
  { icon: WhatsappLogo, title: 'Donors answer on WhatsApp', body: 'One tap: I can donate or Not this time. The hospital sees replies live.' },
]

function StepRequestForm() {
  const [units, setUnits] = useState(3)
  return (
    <Card className="w-full max-w-md p-6 shadow-soft">
      <div className="text-lg font-bold">What do you need?</div>
      <div className="mt-4 grid grid-cols-4 gap-2">
        {BLOOD_TYPES.map((t) => (
          <motion.span
            key={t}
            animate={t === 'O-' ? { scale: [1, 1.08, 1] } : {}}
            transition={{ duration: 0.6, delay: 0.6 }}
            className={cn('flex h-10 items-center justify-center rounded-control border text-sm font-bold', t === 'O-' ? 'border-brand bg-brand text-white' : 'border-line text-ink-2')}
          >
            {fmtType(t)}
          </motion.span>
        ))}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div>
          <div className="mb-1.5 text-[13px] font-semibold text-ink-2">Component</div>
          <div className="flex h-11 items-center rounded-control border border-line px-3.5 text-sm">Whole blood</div>
        </div>
        <div>
          <div className="mb-1.5 text-[13px] font-semibold text-ink-2">Units</div>
          <div className="flex h-11 items-center justify-between rounded-control border border-line px-1.5">
            <button aria-label="Fewer units" className="flex size-8 items-center justify-center rounded-lg hover:bg-surface-2" onClick={() => setUnits((u) => Math.max(1, u - 1))}>
              <Minus className="size-4" />
            </button>
            <span className="text-sm font-bold tabular-nums">{units}</span>
            <button aria-label="More units" className="flex size-8 items-center justify-center rounded-lg hover:bg-surface-2" onClick={() => setUnits((u) => Math.min(9, u + 1))}>
              <Plus className="size-4" />
            </button>
          </div>
        </div>
      </div>
      <div className="mt-5">
        <div className="mb-1.5 text-[13px] font-semibold text-ink-2">Urgency</div>
        <div className="flex gap-1 rounded-control bg-surface-2 p-1 text-[13px] font-semibold">
          <span className="flex-1 rounded-[9px] bg-surface py-2 text-center text-brand-dark shadow-sm">Urgent</span>
          <span className="flex-1 py-2 text-center text-ink-2">Within 24h</span>
          <span className="flex-1 py-2 text-center text-ink-2">This week</span>
        </div>
      </div>
    </Card>
  )
}

function StepMatches() {
  return (
    <Card className="w-full max-w-md shadow-soft">
      <div className="flex items-center justify-between p-5 pb-3">
        <div>
          <div className="text-lg font-bold">
            <CountUp to={38} duration={1.1} /> matching donors
          </div>
          <div className="text-[13px] text-ink-3">O&minus; and compatible, within 20 km</div>
        </div>
        <Pill tone="green">Live</Pill>
      </div>
      <ul>
        {matchDonors.slice(0, 5).map((d, i) => (
          <motion.li
            key={d.id}
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.1, duration: 0.5, ease: EASE }}
            className="flex items-center gap-3 border-t border-line px-5 py-3"
          >
            <Avatar name={d.name} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{d.name}</div>
              <div className="text-xs text-ink-3">{d.distance} km away</div>
            </div>
            <Blood type={d.type} size="sm" />
          </motion.li>
        ))}
      </ul>
    </Card>
  )
}

function StepVisual({ i }: { i: number }) {
  if (i === 0) return <StepRequestForm />
  if (i === 1) return <StepMatches />
  return (
    <Phone statusBg="#075e54" className="max-w-[300px]">
      <WhatsAppChat compact />
    </Phone>
  )
}

function StepItem({ i, active, onActive }: { i: number; active: boolean; onActive: (i: number) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { margin: '-45% 0px -45% 0px' })
  useEffect(() => {
    if (inView) onActive(i)
  }, [inView, i, onActive])
  const s = steps[i]
  return (
    <div ref={ref} className="flex flex-col justify-center lg:min-h-[62vh]">
      <div className={cn('transition-opacity duration-500', active ? 'opacity-100' : 'lg:opacity-35')}>
        <span className={cn('flex size-12 items-center justify-center rounded-card transition-colors duration-500', active ? 'bg-brand text-white' : 'bg-brand-soft text-brand-dark')}>
          <s.icon weight="duotone" className="size-6" />
        </span>
        <h3 className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl">{s.title}</h3>
        <p className="mt-3 max-w-[40ch] text-base leading-relaxed text-ink-2">{s.body}</p>
      </div>
      <div className="mt-8 flex justify-center lg:hidden">
        <StepVisual i={i} />
      </div>
    </div>
  )
}

export function HowItWorks() {
  const [active, setActive] = useState(0)
  return (
    <section id="how" className="relative scroll-mt-16 py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <Reveal>
          <h2 className="max-w-[18ch] text-4xl font-extrabold tracking-tighter sm:text-5xl">From request to donor in three steps</h2>
          <p className="mt-4 max-w-[52ch] text-base leading-relaxed text-ink-2">No phone chains and no social media posts. One request goes to everyone who can help.</p>
        </Reveal>
        <div className="mt-14 grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-24">
          <div className="flex flex-col gap-16 lg:gap-0">
            {steps.map((_, i) => (
              <StepItem key={i} i={i} active={active === i} onActive={setActive} />
            ))}
          </div>
          <div className="relative hidden lg:block">
            <div className="sticky top-28 flex h-[640px] items-center justify-center">
              <div aria-hidden className="absolute inset-0 -z-10 rounded-[40px] bg-gradient-to-br from-brand-soft via-surface-2 to-transparent" />
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0, y: 24, rotateY: 28, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, rotateY: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -16, rotateY: -28, scale: 0.97 }}
                  transition={{ duration: 0.55, ease: EASE }}
                  style={{ transformPerspective: 1200 }}
                  className="flex w-full justify-center"
                >
                  <StepVisual i={active} />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ================= Bento (hospitals) ================= */
function BentoCell({ className, children, delay = 0 }: { className?: string; children: ReactNode; delay?: number }) {
  const reduce = useReducedMotion()
  // Pointer-driven 3D tilt with a moving highlight, so tiles feel like physical panels.
  const px = useMotionValue(0.5)
  const py = useMotionValue(0.5)
  const rx = useSpring(useTransform(py, [0, 1], [6, -6]), { stiffness: 160, damping: 18 })
  const ry = useSpring(useTransform(px, [0, 1], [-7, 7]), { stiffness: 160, damping: 18 })
  const gx = useTransform(px, (v) => `${v * 100}%`)
  const gy = useTransform(py, (v) => `${v * 100}%`)
  const glare = useMotionTemplate`radial-gradient(360px circle at ${gx} ${gy}, rgb(255 255 255 / 0.16), transparent 62%)`
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 40, rotateX: -12 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.8, delay, ease: EASE }}
      style={{ perspective: 1100 }}
      className={className?.match(/lg:col-span-\d/)?.[0]}
    >
      <motion.div
        style={{ rotateX: reduce ? 0 : rx, rotateY: reduce ? 0 : ry, transformPerspective: 1100 }}
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
        className={cn('relative h-full overflow-hidden rounded-card p-7', className?.replace(/lg:col-span-\d/, ''))}
      >
        {children}
        {!reduce && <motion.div aria-hidden style={{ background: glare }} className="pointer-events-none absolute inset-0" />}
      </motion.div>
    </motion.div>
  )
}

export function Bento() {
  const replies = [
    { n: 'Rami H.', s: 'Donated', t: 'green' as const },
    { n: 'Nour K.', s: 'En route', t: 'blue' as const },
    { n: 'Karim F.', s: 'Confirmed', t: 'amber' as const },
    { n: 'Lara T.', s: 'Confirmed', t: 'amber' as const },
  ]
  return (
    <section id="hospitals" className="scroll-mt-16 bg-surface-2/60 py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <Reveal>
          <h2 className="max-w-[20ch] text-4xl font-extrabold tracking-tighter sm:text-5xl">Everything a blood bank needs on one screen</h2>
          <p className="mt-4 max-w-[52ch] text-base leading-relaxed text-ink-2">Replies arrive live, eligibility is checked for you, and every message uses a template approved by Meta.</p>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-4 lg:grid-cols-6">
          {/* 1: live replies, brand gradient */}
          <BentoCell className="bg-gradient-to-br from-[#c8102e] to-[#8f0a20] text-white lg:col-span-4" >
            <div className="grid grid-cols-1 gap-8 md:grid-cols-[1fr_1.1fr] md:items-center">
              <div>
                <h3 className="text-2xl font-bold tracking-tight">Watch replies come in</h3>
                <p className="mt-2 max-w-[34ch] text-[15px] leading-relaxed text-white/85">See who is coming, who is on the way and who asked a question, without refreshing.</p>
                <div className="mt-6 text-6xl font-extrabold tracking-tighter tabular-nums">
                  <CountUp to={6} duration={1.4} />
                  <span className="text-3xl text-white/70"> of 27</span>
                </div>
                <div className="text-sm text-white/85">donors can come</div>
              </div>
              <ul className="flex flex-col gap-2">
                {replies.map((r, i) => (
                  <motion.li
                    key={r.n}
                    initial={{ opacity: 0, x: 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.18, duration: 0.6, ease: EASE }}
                    className="flex items-center gap-3 rounded-control bg-white/12 px-3.5 py-2.5 backdrop-blur-sm ring-1 ring-inset ring-white/20"
                  >
                    <Avatar name={r.n} className="size-8 bg-white/25 from-transparent to-transparent text-xs" />
                    <span className="flex-1 text-sm font-semibold">{r.n}</span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-[#8f0a20]">{r.s}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </BentoCell>

          {/* 2: radius */}
          <BentoCell delay={0.1} className="bg-surface text-ink ring-1 ring-inset ring-line lg:col-span-2">
            <div className="relative mx-auto mb-5 size-40">
              <Ripples count={3} duration={4.5} />
              <div className="absolute inset-[30%] flex items-center justify-center rounded-full bg-brand text-white">
                <Drop weight="fill" className="size-7" />
              </div>
              {[[8, 30], [78, 22], [86, 70], [20, 82], [52, 4]].map(([x, y], i) => (
                <motion.span
                  key={i}
                  className="absolute size-2.5 rounded-full bg-brand"
                  style={{ left: `${x}%`, top: `${y}%` }}
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5 + i * 0.12, type: 'spring', stiffness: 260, damping: 14 }}
                />
              ))}
            </div>
            <h3 className="text-xl font-bold tracking-tight">Pick your radius</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-2">From 5 to 30 km around your hospital. Widen it with one click if you are still short.</p>
          </BentoCell>

          {/* 3: eligibility */}
          <BentoCell delay={0.05} className="bg-surface ring-1 ring-inset ring-line lg:col-span-2">
            <div className="flex flex-wrap gap-2">
              {(['O-', 'O+', 'A-', 'B-'] as const).map((t, i) => (
                <motion.span key={t} initial={{ opacity: 0, scale: 0.6 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.2 + i * 0.1, type: 'spring', stiffness: 300, damping: 16 }}>
                  <Blood type={t} />
                </motion.span>
              ))}
            </div>
            <h3 className="mt-6 text-xl font-bold tracking-tight">Eligibility is built in</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-2">Compatible types are included and the 56-day gap since the last donation is checked for every donor.</p>
          </BentoCell>

          {/* 4: WhatsApp templates, green */}
          <BentoCell delay={0.1} className="bg-[#0b3b2c] text-white lg:col-span-2">
            <div className="rounded-xl rounded-tl-none bg-white p-3 text-[13px] leading-snug text-[#111b21] shadow-lg">
              <b>Nabd | Urgent blood request</b>
              <div className="mt-1 text-[#4a5a63]">AUBMC needs O&minus; whole blood within 4 hours. Can you donate today?</div>
              <div className="mt-2.5 rounded-lg bg-[#f0f2f5] py-1.5 text-center font-semibold text-[#007aa8]">I can donate</div>
            </div>
            <h3 className="mt-6 text-xl font-bold tracking-tight">One tap to answer</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-white/80">Donors reply with a button inside WhatsApp. No app to install, no account to create.</p>
          </BentoCell>

          {/* 5: privacy, ink */}
          <BentoCell delay={0.15} className="bg-[#1b1b1f] text-white ring-1 ring-inset ring-white/10 lg:col-span-2">
            <span className="flex size-12 items-center justify-center rounded-card bg-white/10 text-white">
              <Lock weight="duotone" className="size-6" />
            </span>
            <h3 className="mt-6 text-xl font-bold tracking-tight">Private by default</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-white/75">Hospitals see a first name and a masked number until the donor confirms. Donors never see each other.</p>
          </BentoCell>
        </div>
      </div>
    </section>
  )
}

/* ================= Donors ================= */
export function Donors() {
  const points = [
    { icon: PauseCircle, title: 'Pause whenever you need', body: 'Skip a request, pause for 30 days or reply STOP. You stay in control.' },
    { icon: CalendarCheck, title: 'Know when you can give again', body: 'Your profile counts the days and tells you the moment you are eligible.' },
    { icon: ShieldCheck, title: 'Your number stays private', body: 'Only Nabd holds it. Hospitals see your first name until you confirm.' },
  ]
  return (
    <section id="donors" className="scroll-mt-16 overflow-hidden py-24 lg:py-32">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-5 lg:grid-cols-[0.8fr_1fr] lg:gap-24 lg:px-8">
        <Reveal className="order-2 lg:order-1">
          <BrowserFrame url="nabd.lb/donor" className="mx-auto max-w-[620px]">
            <DonorProfileView embedded />
          </BrowserFrame>
        </Reveal>
        <div className="order-1 lg:order-2">
          <Reveal>
            <h2 className="max-w-[16ch] text-4xl font-extrabold tracking-tighter sm:text-5xl">Give blood on your own terms</h2>
            <p className="mt-4 max-w-[48ch] text-base leading-relaxed text-ink-2">Sign up once in a minute. We only message you when your blood type is needed close by.</p>
          </Reveal>
          <ul className="mt-10 flex flex-col gap-7">
            {points.map((p, i) => (
              <Reveal as="li" key={p.title} delay={i * 0.1} className="flex gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-control bg-brand-soft text-brand-dark">
                  <p.icon weight="duotone" className="size-6" />
                </span>
                <div>
                  <h3 className="text-lg font-bold">{p.title}</h3>
                  <p className="mt-1 max-w-[44ch] text-[15px] leading-relaxed text-ink-2">{p.body}</p>
                </div>
              </Reveal>
            ))}
          </ul>
          <Reveal delay={0.2} className="mt-10">
            <Magnetic>
              <LinkButton to="/join" size="lg">
                Become a donor <ArrowRight weight="bold" className="size-5" />
              </LinkButton>
            </Magnetic>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

/* ================= Blood compatibility (interactive) ================= */
export function BloodMatch() {
  const [recipient, setRecipient] = useState<BloodType>('O-')
  const compat = CAN_RECEIVE_FROM[recipient]
  const total = compat.reduce((s, t) => s + typeCounts[t], 0)
  return (
    <section id="match" className="scroll-mt-16 border-y border-line bg-surface py-24 lg:py-32">
      <div className="mx-auto max-w-5xl px-5 text-center lg:px-8">
        <Reveal>
          <h2 className="text-4xl font-extrabold tracking-tighter sm:text-5xl">Who can give to whom?</h2>
          <p className="mx-auto mt-4 max-w-[50ch] text-base leading-relaxed text-ink-2">Pick the blood type a patient needs. Nabd contacts every compatible donor nearby, not only exact matches.</p>
        </Reveal>

        <Reveal delay={0.1} className="mt-10">
          <div role="radiogroup" aria-label="Recipient blood type" className="mx-auto grid max-w-xl grid-cols-4 gap-2 sm:grid-cols-8">
            {BLOOD_TYPES.map((t) => (
              <button
                key={t}
                role="radio"
                aria-checked={t === recipient}
                onClick={() => setRecipient(t)}
                className={cn(
                  'relative h-12 rounded-control border text-base font-extrabold transition-all duration-200 active:scale-95',
                  t === recipient ? 'border-brand bg-brand text-white shadow-soft' : 'border-line bg-bg text-ink-2 hover:border-ink-3 hover:text-ink',
                )}
              >
                {fmtType(t)}
              </button>
            ))}
          </div>
        </Reveal>

        <div className="mt-12 grid grid-cols-4 gap-3 sm:gap-4">
          {BLOOD_TYPES.map((t) => {
            const ok = compat.includes(t)
            return (
              <motion.div
                key={t}
                layout
                animate={{ scale: ok ? 1 : 0.9, opacity: ok ? 1 : 0.35 }}
                transition={{ type: 'spring', stiffness: 220, damping: 20 }}
                className={cn('flex aspect-square flex-col items-center justify-center rounded-card border', ok ? 'border-brand/40 bg-brand-soft' : 'border-line bg-bg')}
              >
                <span className={cn('text-2xl font-extrabold tracking-tight sm:text-4xl', ok ? 'text-brand-dark' : 'text-ink-3')}>{fmtType(t)}</span>
                <span className={cn('mt-1 text-xs font-medium tabular-nums sm:text-sm', ok ? 'text-brand-dark' : 'text-ink-3')}>{typeCounts[t].toLocaleString('en-US')} donors</span>
              </motion.div>
            )
          })}
        </div>
        <p aria-live="polite" className="mt-8 text-lg text-ink-2">
          A patient with <b className="text-ink">{fmtType(recipient)}</b> can receive from{' '}
          <b className="text-ink">{compat.length} {compat.length === 1 ? 'type' : 'types'}</b>, which is{' '}
          <b className="tabular-nums text-brand-dark">{total.toLocaleString('en-US')}</b> registered donors.
        </p>
      </div>
    </section>
  )
}

/* ================= FAQ ================= */
const faqs = [
  { q: 'Do donors need an account?', a: 'No. A one-minute form and a reply on WhatsApp is all it takes. There is nothing to install and no password to remember.' },
  { q: 'How does Nabd choose who gets a message?', a: 'Blood type compatibility, distance from the hospital, and the 56 days since the last donation. Donors who paused or opted out are never contacted.' },
  { q: 'Can I stop receiving messages?', a: 'Yes. Reply STOP at any time to be removed, or tap Pause for 30 days on any request.' },
  { q: 'Who can see my phone number?', a: 'Only Nabd. Hospitals see your first name and a masked number until you confirm that you are coming.' },
  { q: 'How do hospitals get access?', a: 'Request access from the hospital login page. Accounts are verified manually within 24 hours.' },
  { q: 'What does a WhatsApp message cost?', a: 'Hospitals see the estimated cost before sending. A broadcast to 27 donors is about $0.81.' },
]

export function Faq() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <section id="faq" className="scroll-mt-16 py-24 lg:py-32">
      <div className="mx-auto max-w-3xl px-5 lg:px-8">
        <Reveal>
          <h2 className="text-4xl font-extrabold tracking-tighter sm:text-5xl">Questions people ask</h2>
        </Reveal>
        <div className="mt-10 flex flex-col gap-3">
          {faqs.map((f, i) => {
            const isOpen = open === i
            return (
              <Reveal key={f.q} delay={i * 0.05}>
                <div className={cn('rounded-card border bg-surface transition-colors', isOpen ? 'border-brand/40' : 'border-line')}>
                  <h3>
                    <button
                      className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left text-lg font-semibold"
                      aria-expanded={isOpen}
                      onClick={() => setOpen(isOpen ? null : i)}
                    >
                      {f.q}
                      <motion.span animate={{ rotate: isOpen ? 45 : 0 }} transition={{ duration: 0.25 }} className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-2">
                        <Plus weight="bold" className="size-4" />
                      </motion.span>
                    </button>
                  </h3>
                  <div className={cn('grid transition-[grid-template-rows] duration-300 ease-out-expo', isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
                    <div className="overflow-hidden">
                      <p className="max-w-[60ch] px-6 pb-6 text-base leading-relaxed text-ink-2">{f.a}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ================= Final CTA + footer ================= */
export function FinalCta() {
  return (
    <section className="px-5 pb-24 lg:px-8 lg:pb-32">
      <Reveal>
        <div className="relative isolate mx-auto flex max-w-7xl flex-col items-center overflow-hidden rounded-[28px] bg-gradient-to-br from-[#c8102e] to-[#8f0a20] px-6 py-20 text-center text-white sm:py-28">
          <div aria-hidden className="absolute left-1/2 top-1/2 -z-10 size-[900px] -translate-x-1/2 -translate-y-1/2 [&_span]:border-white/30">
            <Ripples count={5} duration={8} />
          </div>
          <h2 className="max-w-[18ch] text-4xl font-extrabold tracking-tighter sm:text-6xl">The next request could be yours to answer</h2>
          <p className="mt-5 max-w-[46ch] text-lg text-white/85">Join 8,420 donors in Lebanon, or give your blood bank a faster way to reach them.</p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Magnetic>
              <Link to="/join" className="inline-flex h-[52px] items-center gap-2.5 rounded-control bg-white px-7 text-base font-semibold text-[#8f0a20] transition-transform active:scale-[0.98]">
                Become a donor <ArrowRight weight="bold" className="size-5" />
              </Link>
            </Magnetic>
            <Magnetic>
              <Link to="/login" className="inline-flex h-[52px] items-center rounded-control border border-white/60 px-7 text-base font-semibold text-white transition-colors hover:bg-white/10 active:scale-[0.98]">
                Post a request
              </Link>
            </Magnetic>
          </div>
        </div>
      </Reveal>
    </section>
  )
}

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-12 md:flex-row md:items-start md:justify-between lg:px-8">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-3 text-sm leading-relaxed text-ink-2">Connecting Lebanese hospitals with the donors who can help, over the app everyone already uses.</p>
        </div>
        <nav className="grid grid-cols-2 gap-x-14 gap-y-3 text-sm text-ink-2" aria-label="Footer">
          <a href="#how" className="hover:text-ink">How it works</a>
          <Link to="/login" className="hover:text-ink">Hospital login</Link>
          <a href="#donors" className="hover:text-ink">For donors</a>
          <Link to="/join" className="hover:text-ink">Join the donor list</Link>
          <a href="#faq" className="hover:text-ink">FAQ</a>
          <Link to="/whatsapp" className="hover:text-ink">WhatsApp preview</Link>
        </nav>
        <div className="flex items-center gap-2 text-sm text-ink-3">
          <ThemeToggle /> 2026 Nabd
        </div>
      </div>
    </footer>
  )
}
