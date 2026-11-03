import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { Drop } from '@phosphor-icons/react'
import { cn } from '@/lib/cn'
import { fmtType } from '@/lib/blood'
import logoLight from '@/assets/logo-light.png'
import logoDark from '@/assets/logo-dark.png'
import logoMono from '@/assets/logo-mono.png'

/* ---------- Button ---------- */
type Variant = 'primary' | 'ghost' | 'light' | 'wa' | 'dark'
type Size = 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-dark-solid shadow-[inset_0_1px_0_rgb(255_255_255/0.18)]',
  ghost: 'border border-line text-ink hover:bg-surface-2',
  light: 'bg-brand-soft text-brand-dark hover:bg-brand-tint',
  wa: 'bg-[#0a7a4b] text-white hover:bg-[#086b41]',
  dark: 'bg-ink text-bg hover:opacity-90',
}
const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-[13px] gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-[52px] px-7 text-base gap-2.5',
}

export const buttonClass = (v: Variant = 'primary', s: Size = 'md', block = false) =>
  cn(
    'inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-control font-semibold',
    'transition-[transform,background-color,box-shadow,opacity] duration-200 ease-out-expo',
    'active:translate-y-px active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
    variants[v],
    sizes[s],
    block && 'w-full',
  )

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  block?: boolean
}
export const Button = forwardRef<HTMLButtonElement, BtnProps>(function Button(
  { variant, size, block, className, ...p },
  ref,
) {
  return <button ref={ref} className={cn(buttonClass(variant, size, block), className)} {...p} />
})

export function LinkButton({
  variant,
  size,
  block,
  className,
  ...p
}: LinkProps & { variant?: Variant; size?: Size; block?: boolean }) {
  return <Link className={cn(buttonClass(variant, size, block), className)} {...p} />
}

/* ---------- Pill ---------- */
type Tone = 'red' | 'green' | 'amber' | 'blue' | 'grey'
const tones: Record<Tone, string> = {
  red: 'bg-brand-soft text-brand-dark',
  green: 'bg-ok-soft text-ok',
  amber: 'bg-warn-soft text-warn',
  blue: 'bg-info-soft text-info',
  grey: 'bg-surface-2 text-ink-2',
}
export function Pill({ tone = 'grey', className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

/* ---------- Blood badge ---------- */
const bloodSize = {
  sm: 'size-9 text-xs rounded-[10px]',
  md: 'size-11 text-[15px] rounded-control',
  lg: 'size-[72px] text-2xl rounded-[20px]',
}
export function Blood({ type, size = 'md', className }: { type: string; size?: keyof typeof bloodSize; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center bg-brand font-extrabold tracking-tight text-white',
        bloodSize[size],
        className,
      )}
    >
      {fmtType(type)}
    </span>
  )
}

/* ---------- Card ---------- */
export function Card({ className, children, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('rounded-card border border-line bg-surface', className)} {...p}>
      {children}
    </div>
  )
}

/* ---------- Avatar ---------- */
export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <span
      className={cn(
        'inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#f5c0c8] to-[#c8102e] text-[13px] font-bold text-white',
        className,
      )}
    >
      {initials}
    </span>
  )
}

/* ---------- Logo ---------- */
/**
 * Brand logo. Variants come from design/logo-source.jpg (see scripts/make-logos.mjs):
 * - default follows the page theme (dark letters in light mode, pale letters in dark mode)
 * - `light`: for fixed dark surfaces such as the dashboard sidebar
 * - `mono`: all white, for the red brand panel
 */
export function Logo({ className, light, mono, to = '/' }: { className?: string; light?: boolean; mono?: boolean; to?: string }) {
  const img = 'h-9 w-auto select-none'
  return (
    <Link to={to} aria-label="Nabd home" className={cn('inline-flex items-center', className)}>
      {mono ? (
        <img src={logoMono} alt="Nabd" className={img} />
      ) : light ? (
        <img src={logoDark} alt="Nabd" className={img} />
      ) : (
        <>
          <img src={logoLight} alt="Nabd" className={cn(img, 'dark:hidden')} />
          <img src={logoDark} alt="Nabd" className={cn(img, 'hidden dark:block')} />
        </>
      )}
    </Link>
  )
}

/* ---------- Form controls ---------- */
export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  className,
}: {
  label: string
  hint?: ReactNode
  error?: string
  htmlFor?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label htmlFor={htmlFor} className="text-[13px] font-semibold text-ink-2">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-[13px] font-medium text-brand-dark">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[13px] text-ink-3">{hint}</p>
      ) : null}
    </div>
  )
}

export const inputClass =
  'h-[46px] w-full rounded-control border border-line bg-surface px-3.5 text-sm text-ink placeholder:text-ink-3 transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25 aria-[invalid=true]:border-brand'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...p },
  ref,
) {
  return <input ref={ref} className={cn(inputClass, className)} {...p} />
})

const chevron = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256' fill='%238f8d99'><path d='M213.7 101.7l-80 80a8 8 0 0 1-11.4 0l-80-80a8 8 0 0 1 11.4-11.4L128 164.7l74.3-74.4a8 8 0 0 1 11.4 11.4z'/></svg>")`
export function Select({ className, children, ...p }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(inputClass, 'appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-9', className)}
      style={{ backgroundImage: chevron }}
      {...p}
    >
      {children}
    </select>
  )
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
  label,
}: {
  options: { value: T; label: ReactNode }[]
  value: T
  onChange: (v: T) => void
  className?: string
  label?: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('flex gap-1 rounded-control bg-surface-2 p-1', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            'flex-1 whitespace-nowrap rounded-[9px] px-3 py-2 text-[13px] font-semibold transition-all duration-200',
            o.value === value ? 'bg-surface text-ink shadow-sm' : 'text-ink-2 hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Checkbox({
  checked,
  onChange,
  label,
  className,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label?: ReactNode
  className?: string
}) {
  return (
    <label className={cn('inline-flex cursor-pointer items-start gap-2.5 text-sm', className)}>
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="mt-px flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border-[1.5px] border-ink-3 bg-surface text-white transition-colors peer-checked:border-brand peer-checked:bg-brand peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40 [&>svg]:scale-0 peer-checked:[&>svg]:scale-100">
        <svg viewBox="0 0 24 24" className="size-3 transition-transform duration-150" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12l5 5L20 7" />
        </svg>
      </span>
      {label}
    </label>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn('relative h-[22px] w-10 shrink-0 rounded-full transition-colors duration-200', checked ? 'bg-ok' : 'bg-line')}
    >
      <span
        className={cn(
          'absolute left-[3px] top-[3px] size-4 rounded-full bg-white shadow transition-transform duration-200 ease-out-expo',
          checked && 'translate-x-[18px]',
        )}
      />
    </button>
  )
}

/* ---------- Table helpers ---------- */
export const Th = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <th className={cn('whitespace-nowrap border-b border-line px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-ink-3', className)}>
    {children}
  </th>
)
export const Td = ({ children, className, ...p }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn('whitespace-nowrap border-b border-line px-4 py-3.5 align-middle text-sm', className)} {...p}>
    {children}
  </td>
)

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand">
        <Drop weight="duotone" className="size-6" />
      </span>
      <p className="text-base font-bold">{title}</p>
      <p className="max-w-sm text-sm text-ink-2">{body}</p>
      {action}
    </div>
  )
}
