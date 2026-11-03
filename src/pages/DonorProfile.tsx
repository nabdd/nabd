import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { motion } from 'motion/react'
import { MapPin, NavigationArrow } from '@phosphor-icons/react'
import { Avatar, Blood, Card, Logo, Pill, Toggle } from '@/components/ui'
import { CountUp, EASE } from '@/components/motion'
import { ThemeToggle } from '@/components/landing/Nav'
import { history } from '@/data/mock'
import { cn } from '@/lib/cn'

/** Donor home. `embedded` drops the site header so it can sit inside a browser frame on the landing page. */
export function DonorProfileView({ embedded }: { embedded?: boolean }) {
  const [available, setAvailable] = useState(true)
  const [declined, setDeclined] = useState(false)

  return (
    <div className={cn('bg-bg', embedded ? 'h-[470px] overflow-hidden' : 'min-h-[100dvh]')}>
      {!embedded && (
        <header className="border-b border-line bg-surface">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 lg:px-8">
            <Logo />
            <nav className="hidden items-center gap-7 text-sm font-medium text-ink-2 sm:flex" aria-label="Donor">
              {['Home', 'Requests', 'Drives', 'Settings'].map((l, i) => (
                <NavLink key={l} to="/donor" className={cn('py-1 transition-colors hover:text-ink', i === 0 && 'border-b-2 border-brand text-ink')}>
                  {l}
                </NavLink>
              ))}
            </nav>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Avatar name="Rami Haddad" />
            </div>
          </div>
        </header>
      )}

      <div className={cn('mx-auto grid grid-cols-1 gap-5', embedded ? 'p-5' : 'max-w-6xl p-5 lg:grid-cols-[1.1fr_1fr] lg:gap-6 lg:p-8')}>
        <div className="flex flex-col gap-5">
          <Card className="border-none bg-brand p-6 text-white">
            <div className="flex items-center gap-4">
              <Blood type="O-" size="lg" className="bg-white/20" />
              <div>
                <div className="text-2xl font-extrabold leading-tight">Rami Haddad</div>
                <div className="mt-1 flex items-center gap-1 text-sm text-white/85">
                  <MapPin className="size-4" /> Hamra, Beirut, 15 km radius
                </div>
              </div>
            </div>
            <div className="my-5 h-px bg-white/20" />
            <div className="grid grid-cols-3 gap-4">
              {[['Donations', 5], ['Lives helped', 15], ['Badges', 3]].map(([l, n]) => (
                <div key={l}>
                  <div className="text-3xl font-extrabold tabular-nums"><CountUp to={n as number} duration={1.2} /></div>
                  <div className="text-sm text-white/85">{l}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-bold">Available for requests</div>
                <div className="text-sm text-ink-3">{available ? 'You will get WhatsApp alerts' : 'Alerts are paused'}</div>
              </div>
              <Toggle checked={available} onChange={setAvailable} label="Available for requests" />
            </div>
            <div className="my-4 h-px bg-line" />
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-bold">Next eligible date</div>
                <div className="text-sm text-ink-3">56 days after last donation</div>
              </div>
              <Pill tone="green">Today</Pill>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          <motion.div layout transition={{ duration: 0.4, ease: EASE }}>
            {declined ? (
              <Card className="p-5 text-sm text-ink-2">We let AUBMC know you cannot make it. Thank you for replying.</Card>
            ) : (
              <Card className="border-brand-tint bg-brand-soft p-5">
                <div className="flex items-center gap-3">
                  <Blood type="O-" size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-brand-dark">You confirmed: AUBMC</div>
                    <div className="text-sm text-brand-dark">Arrive within 1 hour. Code NB-4471</div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button className="inline-flex h-10 items-center justify-center gap-1.5 rounded-control bg-brand text-sm font-semibold text-white transition-transform active:scale-[0.98]">
                    <NavigationArrow weight="fill" className="size-4" /> Directions
                  </button>
                  <button onClick={() => setDeclined(true)} className="h-10 rounded-control border border-line bg-surface text-sm font-semibold text-ink transition-transform active:scale-[0.98]">
                    Cannot make it
                  </button>
                </div>
              </Card>
            )}
          </motion.div>

          <div>
            <h2 className="mb-3 text-lg font-bold">Donation history</h2>
            <Card className="divide-y divide-line">
              {history.map((h) => (
                <div key={h.place} className="flex items-center gap-3 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{h.place}</div>
                    <div className="text-sm text-ink-3">{h.what}</div>
                  </div>
                  <div className="text-right text-sm text-ink-3">
                    {h.date}
                    <div className="mt-1"><Pill tone="green">Donated</Pill></div>
                  </div>
                </div>
              ))}
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DonorProfile() {
  return <DonorProfileView />
}
