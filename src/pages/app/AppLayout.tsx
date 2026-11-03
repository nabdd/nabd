import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { CalendarBlank, ChartBar, CheckCircle, GearSix, ListBullets, Moon, Sun, UsersThree, X, ChatTeardropText } from '@phosphor-icons/react'
import { Avatar, Logo } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useTheme } from '@/lib/theme'
import { EASE } from '@/components/motion'

/* ---------- Toasts (transient feedback only) ---------- */
type Toast = { id: number; text: string }
const ToastCtx = createContext<(text: string) => void>(() => {})
export const useToast = () => useContext(ToastCtx)

/* ---------- Page header slot ---------- */
export function PageHeader({ title, sub, crumb, children }: { title: ReactNode; sub?: ReactNode; crumb?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex min-h-[72px] flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-line bg-surface px-4 py-3 sm:px-9">
      <div className="min-w-0">
        {crumb}
        <div className="flex flex-wrap items-center gap-2 text-lg font-bold">{title}</div>
        {sub && <div className="text-[13px] text-ink-3">{sub}</div>}
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  )
}

const nav = [
  { to: '/app', end: true, label: 'Requests', icon: ListBullets, badge: 3 },
  { to: '/app/donors', label: 'Donors', icon: UsersThree },
  { to: '/app/drives', label: 'Blood drives', icon: CalendarBlank },
  { to: '/app/templates', label: 'Message templates', icon: ChatTeardropText },
  { to: '/app/reports', label: 'Reports', icon: ChartBar },
]

export default function AppLayout() {
  const [open, setOpen] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const { dark, toggle } = useTheme()
  const loc = useLocation()

  useEffect(() => {
    setOpen(false)
  }, [loc.pathname])
  useEffect(() => {
    document.title = 'Nabd | Blood bank dashboard'
  }, [])

  const push = useCallback((text: string) => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, text }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200)
  }, [])

  const Sidebar = (
    <div className="flex h-full w-[260px] flex-col gap-1.5 bg-side px-5 py-7 text-white">
      <div className="mb-7 flex items-center justify-between px-2">
        <Logo light />
        <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X className="size-5" /></button>
      </div>
      {nav.map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          end={n.end}
          className={({ isActive }) =>
            cn('flex items-center gap-3 rounded-control px-3.5 py-2.5 text-sm font-medium transition-colors', isActive ? 'bg-white/10 text-white' : 'text-[#b8b6b2] hover:bg-white/5 hover:text-white')
          }
        >
          <n.icon className="size-[18px]" weight="duotone" />
          {n.label}
          {n.badge && <span className="ml-auto rounded-full bg-brand px-2 py-0.5 text-[11px] font-bold text-white">{n.badge}</span>}
        </NavLink>
      ))}
      <div className="flex-1" />
      <NavLink to="/app/settings" className={({ isActive }) => cn('flex items-center gap-3 rounded-control px-3.5 py-2.5 text-sm font-medium', isActive ? 'bg-white/10 text-white' : 'text-[#b8b6b2] hover:bg-white/5 hover:text-white')}>
        <GearSix className="size-[18px]" weight="duotone" /> Settings
      </NavLink>
      <button onClick={toggle} className="flex items-center gap-3 rounded-control px-3.5 py-2.5 text-left text-sm font-medium text-[#b8b6b2] hover:bg-white/5 hover:text-white">
        {dark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />} {dark ? 'Light mode' : 'Dark mode'}
      </button>
      <div className="mt-2 flex items-center gap-3 border-t border-white/10 px-2 pt-4">
        <Avatar name="AU" />
        <div>
          <div className="text-[13px] font-semibold">AUBMC Blood Bank</div>
          <div className="text-[11px] text-[#b8b6b2]">Beirut</div>
        </div>
      </div>
    </div>
  )

  return (
    <ToastCtx.Provider value={push}>
      <div className="flex min-h-[100dvh] bg-bg">
        <aside className="sticky top-0 hidden h-[100dvh] shrink-0 lg:block">{Sidebar}</aside>

        <AnimatePresence>
          {open && (
            <>
              <motion.div className="fixed inset-0 z-40 bg-black/50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
              <motion.aside className="fixed inset-y-0 left-0 z-50 lg:hidden" initial={{ x: -270 }} animate={{ x: 0 }} exit={{ x: -270 }} transition={{ duration: 0.35, ease: EASE }}>
                {Sidebar}
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-14 items-center gap-3 border-b border-line bg-surface px-4 lg:hidden">
            <button onClick={() => setOpen(true)} aria-label="Open menu" className="flex size-10 items-center justify-center rounded-control hover:bg-surface-2">
              <ListBullets className="size-6" />
            </button>
            <Logo to="/app" />
          </div>
          <Outlet />
        </div>

        <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[70] flex flex-col items-center gap-2 px-4" aria-live="polite">
          <AnimatePresence>
            {toasts.map((t) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 24, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                className="pointer-events-auto flex items-center gap-2.5 rounded-control bg-ink px-4 py-3 text-sm font-semibold text-bg shadow-lift"
              >
                <CheckCircle weight="fill" className="size-5 text-ok" /> {t.text}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </ToastCtx.Provider>
  )
}
