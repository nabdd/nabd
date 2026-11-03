import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Link as LinkIcon, SpinnerGap } from '@phosphor-icons/react'
import { Button, Card, Checkbox, Field, Input, Logo, Pill, Segmented, Select } from '@/components/ui'
import { ThemeToggle } from '@/components/landing/Nav'
import { BLOOD_TYPES, fmtType } from '@/lib/blood'
import { cities } from '@/data/mock'
import { cn } from '@/lib/cn'
import { EASE } from '@/components/motion'

type Errors = Partial<Record<'name' | 'age' | 'phone' | 'type' | 'consent', string>>

export default function Join() {
  const nav = useNavigate()
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [phone, setPhone] = useState('')
  const [type, setType] = useState<string>('')
  const [city, setCity] = useState('Beirut')
  const [smoke, setSmoke] = useState<'no' | 'yes'>('no')
  const [before, setBefore] = useState<'yes' | 'no'>('yes')
  const [consent, setConsent] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [busy, setBusy] = useState(false)

  function validate(): Errors {
    const e: Errors = {}
    if (name.trim().length < 2) e.name = 'Enter your full name.'
    const a = Number(age)
    if (!age || a < 18 || a > 65) e.age = 'Donors must be 18 to 65.'
    if (phone.replace(/\D/g, '').length < 7) e.phone = 'Enter a valid WhatsApp number.'
    if (!type) e.type = 'Pick your blood type, or choose Not sure.'
    if (!consent) e.consent = 'Please agree to receive WhatsApp alerts.'
    return e
  }

  function submit(ev: FormEvent) {
    ev.preventDefault()
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length) {
      document.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalid="true"]')?.focus()
      return
    }
    setBusy(true)
    setTimeout(() => nav('/join/success', { state: { name: name.trim(), age, type, city, smoke, before } }), 900)
  }

  return (
    <div className="min-h-[100dvh] bg-bg">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
          <Logo />
          <div className="flex items-center gap-2">
            <Pill className="hidden sm:inline-flex">
              <LinkIcon className="size-3.5" /> nabd.lb/join/aubmc
            </Pill>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <motion.main
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: EASE }}
        className="mx-auto w-full max-w-[680px] px-5 py-10 sm:py-14"
      >
        <Pill tone="red">Takes 1 minute, no account needed</Pill>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">Join the donor list</h1>
        <p className="mt-2 max-w-[56ch] leading-relaxed text-ink-2">
          You will only be messaged on WhatsApp when a hospital near you needs your blood type. Reply with one tap, or ignore it.
        </p>

        <Card className="mt-7 p-5 sm:p-8">
          <form onSubmit={submit} noValidate className="flex flex-col gap-5">
            <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
              <Field label="Full name" htmlFor="name" error={errors.name}>
                <Input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name} placeholder="Rami Haddad" />
              </Field>
              <Field label="Age" htmlFor="age" error={errors.age}>
                <Input id="age" inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value.replace(/\D/g, '').slice(0, 2))} aria-invalid={!!errors.age} placeholder="28" />
              </Field>
            </div>

            <Field label="WhatsApp number" htmlFor="phone" error={errors.phone} hint="We will send a code to confirm it.">
              <div className="flex gap-2">
                <span className="flex h-[46px] shrink-0 items-center rounded-control border border-line bg-surface-2 px-3.5 text-sm font-semibold">LB +961</span>
                <Input id="phone" type="tel" autoComplete="tel-national" value={phone} onChange={(e) => setPhone(e.target.value)} aria-invalid={!!errors.phone} placeholder="70 123 456" />
              </div>
            </Field>

            <Field label="Blood type" error={errors.type} hint={!errors.type ? 'Not sure? Choose Not sure and the hospital will type you on your first visit.' : undefined}>
              <div role="radiogroup" aria-label="Blood type" data-invalid={!!errors.type} className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                {BLOOD_TYPES.map((t) => (
                  <motion.button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={type === t}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => setType(t)}
                    className={cn('h-[46px] rounded-control border text-sm font-bold transition-colors', type === t ? 'border-brand bg-brand text-white' : 'border-line bg-surface hover:border-ink-3')}
                  >
                    {fmtType(t)}
                  </motion.button>
                ))}
              </div>
              <button
                type="button"
                role="radio"
                aria-checked={type === 'unknown'}
                onClick={() => setType('unknown')}
                className={cn('h-10 rounded-control border text-sm font-semibold transition-colors', type === 'unknown' ? 'border-brand bg-brand-soft text-brand-dark' : 'border-line text-ink-2 hover:border-ink-3')}
              >
                Not sure
              </button>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Country" htmlFor="country">
                <Select id="country" defaultValue="Lebanon">
                  <option>Lebanon</option>
                </Select>
              </Field>
              <Field label="City" htmlFor="city">
                <Select id="city" value={city} onChange={(e) => setCity(e.target.value)}>
                  {cities.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Do you smoke?">
                <Segmented label="Do you smoke" value={smoke} onChange={setSmoke} options={[{ value: 'no', label: 'No' }, { value: 'yes', label: 'Yes' }]} />
              </Field>
              <Field label="Have you donated blood before?">
                <Segmented label="Donated before" value={before} onChange={setBefore} options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'First time' }]} />
              </Field>
            </div>

            <div className="h-px bg-line" />

            <div>
              <Checkbox
                checked={consent}
                onChange={setConsent}
                label={<span className="leading-relaxed">I agree to receive WhatsApp messages from Nabd about blood requests. I can reply <b>STOP</b> at any time to be removed.</span>}
              />
              {errors.consent && <p role="alert" className="mt-2 text-[13px] font-medium text-brand-dark">{errors.consent}</p>}
            </div>

            <Button type="submit" size="lg" block disabled={busy}>
              {busy ? <><SpinnerGap className="size-5 animate-spin" /> Joining...</> : 'Join the donor list'}
            </Button>
            <p className="text-center text-[13px] leading-relaxed text-ink-3">
              Your phone number is never shown to other donors. Hospitals see only your first name until you confirm a donation.
            </p>
          </form>
        </Card>
      </motion.main>
    </div>
  )
}
