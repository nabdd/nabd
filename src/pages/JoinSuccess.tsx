import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'motion/react'
import { Check, Copy, WhatsappLogo } from '@phosphor-icons/react'
import { Blood, Card, LinkButton } from '@/components/ui'
import { Ripples } from '@/components/motion'

interface State { name?: string; age?: string; type?: string; city?: string; smoke?: string; before?: string }

export default function JoinSuccess() {
  const s = ((useLocation().state as State | null) ?? {})
  const name = s.name ?? 'Rami Haddad'
  const first = name.split(' ')[0]
  const type = s.type && s.type !== 'unknown' ? s.type : s.type === 'unknown' ? '?' : 'O+'
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    document.title = 'You are on the list | Nabd'
  }, [])

  async function copy() {
    try {
      await navigator.clipboard.writeText('https://nabd.lb/join')
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-bg px-5 py-10">
      <div className="flex w-full max-w-md flex-col items-center gap-5 text-center">
        <div className="relative size-28">
          <Ripples count={3} duration={3.5} className="[&_span]:border-ok/50" />
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 220, damping: 14, delay: 0.1 }}
            className="absolute inset-3 flex items-center justify-center rounded-full bg-ok-soft text-ok"
          >
            <svg viewBox="0 0 24 24" className="size-10" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <motion.path d="M5 12l5 5L20 7" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.35, duration: 0.5 }} />
            </svg>
          </motion.div>
        </div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.6 }} className="flex w-full flex-col items-center gap-5">
          <h1 className="text-3xl font-extrabold tracking-tight">You are on the list, {first}</h1>
          <p className="leading-relaxed text-ink-2">
            We sent a confirmation to your WhatsApp. Reply <b className="text-ink">YES</b> once to verify your number. That is it.
          </p>
          <Card className="w-full p-4 text-left">
            <div className="flex items-center gap-3">
              <Blood type={type} size="sm" />
              <div className="min-w-0">
                <div className="truncate font-semibold">
                  {name}{s.age ? `, ${s.age}` : ''}
                </div>
                <div className="text-[13px] text-ink-3">
                  {s.city ?? 'Beirut'}, Lebanon. {s.smoke === 'yes' ? 'Smoker' : 'Non-smoker'}. {s.before === 'no' ? 'First donation' : 'Donated before'}
                </div>
              </div>
            </div>
          </Card>
          <a href="https://wa.me/" target="_blank" rel="noreferrer" className="inline-flex h-[52px] w-full items-center justify-center gap-2.5 rounded-control bg-[#0a7a4b] text-base font-semibold text-white transition-transform hover:bg-[#086b41] active:scale-[0.98]">
            <WhatsappLogo weight="fill" className="size-5" /> Open WhatsApp to verify
          </a>
          <button onClick={copy} className="inline-flex items-center gap-2 text-sm text-ink-2 hover:text-ink">
            Share this link with friends: <b className="text-ink">nabd.lb/join</b>
            {copied ? <Check className="size-4 text-ok" weight="bold" /> : <Copy className="size-4" />}
          </button>
          <div className="flex gap-3 pt-2 text-sm">
            <LinkButton to="/donor" variant="light" size="sm">View my profile</LinkButton>
            <Link to="/" className="flex h-9 items-center px-2 font-semibold text-ink-2 hover:text-ink">Back home</Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
