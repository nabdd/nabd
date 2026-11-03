import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react'
import { ArrowClockwise, ArrowLeft, Checks, DotsThreeVertical, Lock, Microphone, Plus, SealCheck } from '@phosphor-icons/react'
import { cn } from '@/lib/cn'

type Msg =
  | { kind: 'system'; text: string }
  | { kind: 'in'; body: ReactNode; time: string }
  | { kind: 'buttons'; items: string[] }
  | { kind: 'out'; text: string; time: string }

const script: { delay: number; msg: Msg }[] = [
  { delay: 300, msg: { kind: 'system', text: 'Messages are end-to-end encrypted' } },
  {
    delay: 1300,
    msg: {
      kind: 'in',
      time: '10:09',
      body: (
        <>
          <b>Nabd | Urgent blood request</b>
          <br />
          <br />
          Hi Rami, <b>AUBMC Blood Bank</b> urgently needs <b>O&minus; whole blood</b> (3 units) within 4 hours. You are about 1.2 km away.
          <br />
          <br />
          Blood Bank, Ground floor, Building C. Bring your ID.
          <br />
          <br />
          Can you donate today?
        </>
      ),
    },
  },
  { delay: 700, msg: { kind: 'buttons', items: ['I can donate', 'Not this time', 'Pause for 30 days'] } },
  { delay: 1700, msg: { kind: 'out', text: 'I can donate', time: '10:12' } },
  { delay: 1200, msg: { kind: 'in', time: '10:12', body: <>Thank you Rami! When can you arrive?</> } },
  { delay: 600, msg: { kind: 'buttons', items: ['Within 1 hour', 'Later today', 'Tomorrow'] } },
  { delay: 1700, msg: { kind: 'out', text: 'Within 1 hour', time: '10:13' } },
  {
    delay: 1300,
    msg: {
      kind: 'in',
      time: '10:13',
      body: (
        <>
          Great. The blood bank is expecting you. Show this code at reception: <b>NB-4471</b>
          <br />
          <br />
          Directions: maps.app/aubmc-bb
        </>
      ),
    },
  },
]

export function WhatsAppChat({ className, autoplay = true, compact }: { className?: string; autoplay?: boolean; compact?: boolean }) {
  const reduce = useReducedMotion()
  const root = useRef<HTMLDivElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const inView = useInView(root, { amount: 0.35 })
  const [count, setCount] = useState(reduce ? script.length : 0)
  const [run, setRun] = useState(0)

  useEffect(() => {
    if (reduce || !autoplay || !inView) return
    setCount(0)
    const timers: number[] = []
    let t = 0
    script.forEach((s, i) => {
      t += s.delay
      timers.push(window.setTimeout(() => setCount(i + 1), t))
    })
    return () => timers.forEach(clearTimeout)
  }, [run, inView, autoplay, reduce])

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' })
  }, [count])

  const next = script[count]?.msg
  const typing = !reduce && autoplay && count > 0 && count < script.length && next?.kind === 'in'
  const done = count >= script.length

  return (
    <div ref={root} className={cn('flex h-full min-h-0 flex-col bg-[#ece5dd] text-[#111b21]', className)}>
      <div className="flex h-16 shrink-0 items-center gap-3 bg-[#075e54] px-4 text-white">
        <ArrowLeft className="size-5" />
        <span className="flex size-9 items-center justify-center rounded-full bg-[#c8102e] text-sm font-bold">N</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-base font-semibold">
            Nabd <SealCheck weight="fill" className="size-4 text-[#7fe0c3]" />
          </div>
          <div className="text-xs opacity-80">{typing ? 'typing...' : 'Business account'}</div>
        </div>
        <DotsThreeVertical weight="bold" className="size-5" />
      </div>

      <div ref={scroller} className="no-scrollbar flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-3.5 py-4">
        <AnimatePresence initial={false}>
          {script.slice(0, count).map((s, i) => (
            <motion.div
              key={i}
              layout={false}
              initial={reduce ? false : { opacity: 0, y: 14, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className={cn('flex flex-col', s.msg.kind === 'out' ? 'items-end' : 'items-start', s.msg.kind === 'system' && 'items-center')}
            >
              <Bubble m={s.msg} compact={compact} />
            </motion.div>
          ))}
          {typing && (
            <motion.div key="typing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex w-16 justify-center gap-1 rounded-xl bg-white py-3 shadow-sm">
              {[0, 1, 2].map((d) => (
                <motion.span key={d} className="size-1.5 rounded-full bg-[#8696a0]" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.8, repeat: Infinity, delay: d * 0.15 }} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        {done && autoplay && !reduce && (
          <button
            onClick={() => setRun((r) => r + 1)}
            className="mx-auto mt-1 inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold text-[#075e54] shadow-sm transition-transform active:scale-95"
          >
            <ArrowClockwise className="size-3.5" /> Replay
          </button>
        )}
      </div>

      <div className="flex h-[66px] shrink-0 items-center gap-2.5 bg-[#f0f0f0] px-3 pb-2">
        <Plus className="size-5 text-[#54656f]" />
        <div className="flex h-10 flex-1 items-center rounded-full bg-white px-4 text-sm text-[#667781]">Message</div>
        <span className="flex size-10 items-center justify-center rounded-full bg-[#075e54] text-white">
          <Microphone weight="fill" className="size-5" />
        </span>
      </div>
    </div>
  )
}

function Bubble({ m, compact }: { m: Msg; compact?: boolean }) {
  const text = compact ? 'text-[13px]' : 'text-sm'
  if (m.kind === 'system')
    return (
      <div className="flex max-w-[90%] items-center gap-1.5 rounded-lg bg-[#fff5c4] px-3 py-1.5 text-center text-xs text-[#54656f]">
        <Lock weight="fill" className="size-3 shrink-0" /> {m.text}
      </div>
    )
  if (m.kind === 'in')
    return (
      <div className={cn('max-w-[88%] rounded-[10px] rounded-tl-none bg-white px-3 py-2.5 leading-[1.45] shadow-[0_1px_1px_rgb(0_0_0/0.1)]', text)}>
        {m.body}
        <div className="mt-1 text-right text-[11px] text-[#8a8a8a]">{m.time}</div>
      </div>
    )
  if (m.kind === 'out')
    return (
      <div className={cn('max-w-[88%] rounded-[10px] rounded-tr-none bg-[#dcf8c6] px-3 py-2.5 shadow-[0_1px_1px_rgb(0_0_0/0.1)]', text)}>
        {m.text}
        <div className="mt-1 flex items-center justify-end gap-1 text-[11px] text-[#8a8a8a]">
          {m.time} <Checks weight="bold" className="size-3.5 text-[#53bdeb]" />
        </div>
      </div>
    )
  return (
    <div className="flex w-[88%] flex-col gap-1.5">
      {m.items.map((b) => (
        <div key={b} className="rounded-[10px] bg-white py-2.5 text-center text-[15px] font-semibold text-[#007aa8] shadow-[0_1px_1px_rgb(0_0_0/0.1)]">
          {b}
        </div>
      ))}
    </div>
  )
}

/** Chat window chrome (a plain web panel, not a device mockup). */
export function Phone({ children, className }: { children: ReactNode; className?: string; statusBg?: string }) {
  return (
    <div className={cn('relative mx-auto flex h-[580px] w-full max-w-[380px] flex-col overflow-hidden rounded-card border border-line bg-surface shadow-lift', className)}>
      {children}
    </div>
  )
}

/** Browser window chrome for showing a web page in context. */
export function BrowserFrame({ url, children, className }: { url: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('overflow-hidden rounded-card border border-line bg-surface shadow-lift', className)}>
      <div className="flex h-11 items-center gap-3 border-b border-line bg-surface-2 px-4">
        <div className="mx-auto flex h-7 w-full max-w-xs items-center justify-center rounded-full bg-surface text-xs font-medium text-ink-3">{url}</div>
      </div>
      {children}
    </div>
  )
}
