import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Eye, EyeSlash, SpinnerGap } from '@phosphor-icons/react'
import { Button, Checkbox, Field, Input, Logo } from '@/components/ui'
import { Ripples, EASE } from '@/components/motion'
import { ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth'

export default function Login() {
  const nav = useNavigate()
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/app'
  const { hospital, login } = useAuth()
  const [email, setEmail] = useState(import.meta.env.DEV ? 'bloodbank@aubmc.org.lb' : '')
  const [pw, setPw] = useState('')
  const [show, setShow] = useState(false)
  const [keep, setKeep] = useState(true)
  const [err, setErr] = useState<{ email?: string; pw?: string; form?: string }>({})
  const [busy, setBusy] = useState(false)

  if (hospital) return <Navigate to="/app" replace />

  async function submit(e: FormEvent) {
    e.preventDefault()
    const next: typeof err = {}
    if (!/^\S+@\S+\.\S+$/.test(email)) next.email = 'Enter your work email.'
    if (!pw) next.pw = 'Enter your password.'
    setErr(next)
    if (Object.keys(next).length) return
    setBusy(true)
    try {
      await login(email.trim(), pw)
      nav(from, { replace: true })
    } catch (e) {
      setErr({ form: e instanceof ApiError ? e.message : 'Could not sign in. Try again.' })
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-[100dvh] bg-bg lg:grid-cols-[minmax(0,620px)_1fr]">
      <aside className="relative isolate hidden flex-col justify-between overflow-hidden bg-brand p-14 text-white lg:flex">
        <div aria-hidden className="absolute -bottom-40 -left-40 -z-10 size-[620px] [&_span]:border-white/30">
          <Ripples count={4} duration={7} />
        </div>
        <Logo mono />
        <div>
          <h1 className="max-w-[14ch] text-5xl font-extrabold leading-[1.05] tracking-tighter">Stop calling donors one by one.</h1>
          <p className="mt-5 max-w-[44ch] text-[17px] leading-relaxed text-white/90">
            Post a request, pick matching donors, and send one WhatsApp broadcast. Replies arrive live on your dashboard.
          </p>
        </div>
        <p className="text-sm text-white/85">Used by 23 hospitals and blood banks across Lebanon</p>
      </aside>

      <main className="flex items-center justify-center px-5 py-10">
        <motion.form
          onSubmit={submit}
          noValidate
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="flex w-full max-w-[420px] flex-col gap-5"
        >
          <div className="lg:hidden"><Logo /></div>
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight">Hospital sign in</h2>
            <p className="mt-1.5 text-ink-2">Use the account assigned to your blood bank.</p>
          </div>
          {err.form && <p role="alert" className="rounded-control bg-brand-soft px-3.5 py-3 text-sm font-medium text-brand-dark">{err.form}</p>}
          <Field label="Work email" htmlFor="email" error={err.email}>
            <Input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!err.email} />
          </Field>
          <Field label="Password" htmlFor="pw" error={err.pw} hint={import.meta.env.DEV ? 'Demo password: nabd-demo-2026 (development only)' : undefined}>
            <div className="relative">
              <Input id="pw" type={show ? 'text' : 'password'} autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} aria-invalid={!!err.pw} className="pr-12" />
              <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-1.5 top-1.5 flex size-8 items-center justify-center rounded-lg text-ink-3 hover:bg-surface-2 hover:text-ink">
                {show ? <EyeSlash className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>
          </Field>
          <div className="flex items-center justify-between">
            <Checkbox checked={keep} onChange={setKeep} label="Keep me signed in" />
            <button type="button" className="text-sm font-semibold text-brand-dark hover:underline">Forgot password?</button>
          </div>
          <Button type="submit" size="lg" block disabled={busy}>
            {busy ? <><SpinnerGap className="size-5 animate-spin" /> Signing in...</> : 'Sign in'}
          </Button>
          <div className="h-px bg-line" />
          <p className="text-center text-sm leading-relaxed text-ink-2">
            New hospital? <b className="text-ink">Request access</b>. Accounts are verified manually within 24h.
          </p>
          <Link to="/" className="text-center text-sm font-semibold text-ink-3 hover:text-ink">Back to home</Link>
        </motion.form>
      </main>
    </div>
  )
}
