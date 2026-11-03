import { useState } from 'react'
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react'
import { List, Moon, Sun, X } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { LinkButton, Logo } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useTheme } from '@/lib/theme'

const links = [
  { href: '#how', label: 'How it works' },
  { href: '#hospitals', label: 'For hospitals' },
  { href: '#donors', label: 'For donors' },
  { href: '#match', label: 'Compatibility' },
  { href: '#faq', label: 'FAQ' },
]

export function ThemeToggle({ className }: { className?: string }) {
  const { dark, toggle } = useTheme()
  return (
    <button
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={cn('flex size-10 items-center justify-center rounded-control text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink', className)}
    >
      {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </button>
  )
}

export function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const { scrollY } = useScroll()
  useMotionValueEvent(scrollY, 'change', (y) => {
    const s = y > 16
    if (s !== scrolled) setScrolled(s)
  })

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-40 transition-[background-color,border-color,backdrop-filter] duration-300',
        scrolled || open ? 'border-b border-line bg-bg/85 backdrop-blur-xl' : 'border-b border-transparent',
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-5 lg:px-8">
        <Logo />
        <nav className="hidden items-center gap-6 whitespace-nowrap text-sm font-medium text-ink-2 lg:flex xl:gap-7" aria-label="Primary">
          {links.map((l) => (
            <a key={l.href} href={l.href} className={cn(l.href === '#match' && 'hidden xl:inline', 'relative py-1 transition-colors hover:text-ink after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-brand after:transition-transform hover:after:scale-x-100')}>
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LinkButton to="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">
            Hospital login
          </LinkButton>
          <LinkButton to="/join" size="sm" className="hidden sm:inline-flex">
            Become a donor
          </LinkButton>
          <button className="flex size-10 items-center justify-center rounded-control hover:bg-surface-2 lg:hidden" onClick={() => setOpen((o) => !o)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}>
            {open ? <X className="size-5" /> : <List className="size-5" />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden lg:hidden"
          >
            <div className="flex flex-col gap-1 px-5 pb-5">
              {links.map((l) => (
                <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-control px-3 py-3 text-base font-medium text-ink-2 hover:bg-surface-2">
                  {l.label}
                </a>
              ))}
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Link to="/login" className="flex h-11 items-center justify-center rounded-control border border-line text-sm font-semibold">
                  Hospital login
                </Link>
                <Link to="/join" className="flex h-11 items-center justify-center rounded-control bg-brand text-sm font-semibold text-white">
                  Become a donor
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
