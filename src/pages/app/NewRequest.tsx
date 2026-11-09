import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowRight, SpinnerGap, WhatsappLogo } from '@phosphor-icons/react'
import { Avatar, Blood, Button, Card, Checkbox, EmptyState, Field, Input, Pill, Segmented, Select, Td, Th } from '@/components/ui'
import { BLOOD_TYPES, fmtType, type BloodType } from '@/lib/blood'
import { api, ApiError } from '@/lib/api'
import { eligibleLabel, fmtDate } from '@/lib/format'
import type { Preview, Urgency } from '@/lib/types'
import { cn } from '@/lib/cn'
import { PageHeader, useToast } from './AppLayout'

const urgText: Record<Urgency, string> = { urgent: 'within 4 hours', '24h': 'within 24 hours', week: 'this week' }
/** Estimated WhatsApp conversation cost per message (USD). Shown as an estimate only. */
const COST_PER_MESSAGE = 0.03

export default function NewRequest() {
  const nav = useNavigate()
  const toast = useToast()
  const [type, setType] = useState<BloodType>('O-')
  const [compat, setCompat] = useState(true)
  const [component, setComponent] = useState('Whole blood')
  const [units, setUnits] = useState('3')
  const [urgency, setUrgency] = useState<Urgency>('urgent')
  const [ref, setRef] = useState('')
  const [note, setNote] = useState('Emergency surgery. Please come to the Blood Bank, Ground floor, Building C. Bring your ID.')
  const [radius, setRadius] = useState('20')
  const [minDays, setMinDays] = useState('56')

  const [preview, setPreview] = useState<Preview | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState('')
  const [picked, setPicked] = useState<Record<number, boolean>>({})
  const [others, setOthers] = useState(true)
  const [visible, setVisible] = useState(8)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  // Re-run the match whenever who we are looking for changes. Debounced so typing and clicking stay smooth.
  useEffect(() => {
    const ctl = new AbortController()
    setLoading(true)
    const t = setTimeout(() => {
      api<Preview>('/requests/preview', { method: 'POST', signal: ctl.signal, body: { bloodType: type, includeCompatible: compat, radiusKm: Number(radius), minDays: Number(minDays) } })
        .then((p) => {
          setPreview(p)
          setPicked(Object.fromEntries(p.donors.map((d) => [d.id, d.selected])))
          setOthers(true)
          setLoadErr('')
          setLoading(false)
        })
        .catch((e) => {
          if ((e as Error).name === 'AbortError') return
          setLoadErr((e as ApiError).message)
          setLoading(false)
        })
    }, 250)
    return () => {
      clearTimeout(t)
      ctl.abort()
    }
  }, [type, compat, radius, minDays])

  const donors = preview?.donors ?? []
  const total = preview?.total ?? 0
  const loadedDefault = donors.filter((d) => d.selected).length
  const hiddenDefault = Math.max(0, (preview?.defaultSelected ?? 0) - loadedDefault)
  const rowsSelected = donors.filter((d) => picked[d.id]).length
  const selected = rowsSelected + (others ? hiddenDefault : 0)
  const allOn = donors.length > 0 && rowsSelected === donors.filter((d) => d.eligibleInDays === 0).length && (hiddenDefault === 0 || others)
  const unitsN = Math.max(1, Number(units) || 1)
  const cost = (selected * COST_PER_MESSAGE).toFixed(2)
  const counts = useMemo(() => preview?.counts, [preview])

  function toggleAll(v: boolean) {
    setPicked(Object.fromEntries(donors.map((d) => [d.id, v && d.eligibleInDays === 0])))
    setOthers(v)
  }

  async function send() {
    if (!Number(units) || Number(units) < 1) return setErr('Enter how many units you need.')
    if (selected === 0) return setErr('Select at least one donor to contact.')
    setErr('')
    setBusy(true)
    const base = { bloodType: type, includeCompatible: compat, radiusKm: Number(radius), minDays: Number(minDays), component, units: unitsN, urgency, patientRef: ref || undefined, note: note || undefined }
    // If the hidden donors are included, send "everyone except the ones I unticked". Otherwise only the ticked ones.
    const body = others ? { ...base, excludeDonorIds: donors.filter((d) => !picked[d.id]).map((d) => d.id) } : { ...base, donorIds: donors.filter((d) => picked[d.id]).map((d) => d.id) }
    try {
      const r = await api<{ id: number; sent: number; failed: number }>('/requests', { method: 'POST', body })
      toast(r.failed ? `Sent to ${r.sent} donors, ${r.failed} failed` : `Request sent to ${r.sent} donors on WhatsApp`, r.failed > 0 && r.sent === 0)
      nav(`/app/requests/${r.id}`)
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Could not send the request.')
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader crumb={<div className="text-[13px] text-ink-3"><Link to="/app" className="hover:text-ink">Requests</Link> / </div>} title="New request" />

      <div className="flex flex-col items-start gap-6 p-4 sm:p-9 xl:flex-row">
        {/* ---- form ---- */}
        <Card className="flex w-full flex-col gap-5 p-6 xl:w-[440px] xl:shrink-0">
          <h2 className="text-lg font-bold">1. What do you need?</h2>
          <Field label="Blood type">
            <div role="radiogroup" aria-label="Blood type" className="grid grid-cols-4 gap-2">
              {BLOOD_TYPES.map((t) => (
                <motion.button key={t} type="button" role="radio" aria-checked={type === t} whileTap={{ scale: 0.94 }} onClick={() => setType(t)}
                  className={cn('h-10 rounded-control border text-sm font-bold transition-colors', type === t ? 'border-brand bg-brand text-white' : 'border-line bg-surface hover:border-ink-3')}>
                  {fmtType(t)}
                </motion.button>
              ))}
            </div>
            <Checkbox className="mt-1" checked={compat} onChange={setCompat} label={<span className="text-[13px]">Include compatible types</span>} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Component" htmlFor="component">
              <Select id="component" value={component} onChange={(e) => setComponent(e.target.value)}>
                <option>Whole blood</option><option>Platelets</option><option>Plasma</option><option>Red cells</option>
              </Select>
            </Field>
            <Field label="Units" htmlFor="units">
              <Input id="units" inputMode="numeric" value={units} onChange={(e) => setUnits(e.target.value.replace(/\D/g, '').slice(0, 2))} />
            </Field>
          </div>

          <Field label="Urgency">
            <Segmented<Urgency> label="Urgency" value={urgency} onChange={setUrgency} options={[{ value: 'urgent', label: 'Urgent (up to 4h)' }, { value: '24h', label: 'Within 24h' }, { value: 'week', label: 'This week' }]} />
          </Field>
          <Field label="Patient reference (internal)" htmlFor="ref">
            <Input id="ref" value={ref} maxLength={60} onChange={(e) => setRef(e.target.value)} placeholder="ER-2211-0347" />
          </Field>
          <Field label="Note to donors (optional)" htmlFor="note">
            <textarea id="note" rows={3} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} className="w-full resize-none rounded-control border border-line bg-surface px-3.5 py-3 text-sm leading-relaxed focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25" />
          </Field>

          <h2 className="pt-1 text-lg font-bold">2. Who should we contact?</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Radius" htmlFor="radius">
              <Select id="radius" value={radius} onChange={(e) => setRadius(e.target.value)}>
                <option value="5">5 km</option><option value="10">10 km</option><option value="20">20 km</option><option value="30">30 km</option>
              </Select>
            </Field>
            <Field label="Eligibility" htmlFor="elig">
              <Select id="elig" value={minDays} onChange={(e) => setMinDays(e.target.value)}>
                <option value="56">56+ days since last</option><option value="30">30+ days since last</option>
              </Select>
            </Field>
          </div>
        </Card>

        {/* ---- matches + preview ---- */}
        <div className="flex w-full min-w-0 flex-1 flex-col gap-4">
          <Card className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-bold">{loading && !preview ? <span className="skeleton inline-block h-6 w-48" /> : `${total} matching donors found`}</div>
                <div className="text-[13px] text-ink-3">{fmtType(type)}{compat ? ' and compatible' : ''} donors within {radius} km of your hospital, eligible to donate</div>
              </div>
              <Pill tone={loading ? 'grey' : 'green'}>{loading ? 'Updating' : 'Live'}</Pill>
            </div>
            {counts && (
              <div className="mt-3.5 flex flex-wrap gap-2">
                <Pill tone="red">{fmtType(type)}: {counts.exact}</Pill>
                {compat && <Pill>Compatible: {counts.compatible}</Pill>}
                <Pill tone="blue">Responded before: {counts.previouslyResponded}</Pill>
                <Pill>Within 5 km: {counts.within5km}</Pill>
              </div>
            )}
          </Card>

          <Card className="overflow-hidden">
            {loadErr ? (
              <EmptyState title="Could not find donors" body={loadErr} />
            ) : total === 0 && !loading ? (
              <EmptyState title="No donors match" body="Try a wider radius, include compatible types, or shorten the eligibility gap." />
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-line px-4 py-3 text-[13px]">
                  <Checkbox checked={allOn} onChange={toggleAll} label={<span><b>{selected} selected</b> <span className="text-ink-3">of {total}</span></span>} />
                  <span className="text-ink-3">Sorted by distance</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead><tr><Th className="w-11" /><Th>Donor</Th><Th>Type</Th><Th>Distance</Th><Th>Last donation</Th><Th>Past responses</Th><Th>Status</Th></tr></thead>
                    <tbody>
                      {donors.slice(0, visible).map((d) => (
                        <tr key={d.id} className={cn('transition-opacity', !picked[d.id] && 'opacity-60')}>
                          <Td><Checkbox checked={!!picked[d.id]} onChange={(v) => setPicked((p) => ({ ...p, [d.id]: v }))} label={<span className="sr-only">Select {d.name}</span>} /></Td>
                          <Td><div className="flex items-center gap-3"><Avatar name={d.name} /><div><b>{d.name}</b><div className="text-xs text-ink-3">{d.phone}</div></div></div></Td>
                          <Td><Blood type={d.bloodType} size="sm" /></Td>
                          <Td className="tabular-nums">{d.distanceKm} km</Td>
                          <Td className={d.lastDonation ? '' : 'text-ink-3'}>{fmtDate(d.lastDonation)}</Td>
                          <Td>{d.responses.total ? <Pill tone={d.responses.yes / d.responses.total >= 0.6 ? 'green' : 'amber'}>{d.responses.yes} / {d.responses.total} yes</Pill> : <Pill>New</Pill>}</Td>
                          <Td><Pill tone={d.eligibleInDays === 0 ? 'green' : 'amber'}>{d.eligibleInDays === 0 ? 'Eligible' : `Eligible ${eligibleLabel(d.eligibleInDays).toLowerCase()}`}</Pill></Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-4 px-4 py-3 text-[13px] text-ink-3">
                  Showing {Math.min(visible, donors.length)} of {total}
                  {visible < donors.length && <button className="font-semibold text-ink hover:underline" onClick={() => setVisible((v) => v + 10)}>Load more</button>}
                  {hiddenDefault > 0 && <Checkbox checked={others} onChange={setOthers} label={<span>Include the other {hiddenDefault} not listed</span>} />}
                </div>
              </>
            )}
          </Card>

          <Card className="border-wa/60 bg-[#f4fcf7] p-5 dark:bg-[#0f2a1f]">
            <div className="flex items-start gap-3.5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-[#0a7a4b] text-white"><WhatsappLogo weight="fill" className="size-6" /></span>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold">WhatsApp message preview</h3>
                <p className="mb-3 text-[13px] text-ink-3">Template <b className="text-ink">blood_request_urgent_v2</b>, approved by Meta, sent via WhatsApp Business API</p>
                <div className="rounded-control border border-line bg-surface p-3.5 text-sm leading-relaxed">
                  <b>Nabd | {urgency === 'urgent' ? 'Urgent blood request' : 'Blood request'}</b>
                  <br />
                  Hi {'{{name}}'}, <b>your hospital</b> {urgency === 'urgent' ? 'urgently ' : ''}needs <b>{fmtType(type)} {component.toLowerCase()}</b> ({unitsN} {unitsN === 1 ? 'unit' : 'units'}) {urgText[urgency]}. You are about {'{{distance}}'} km away.
                  {note && <><br /><br /><span className="text-ink-2">{note}</span></>}
                  <br /><br />Can you donate today?
                  <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-info">
                    <span className="rounded-lg bg-surface-2 px-2.5 py-1">I can donate</span><span className="rounded-lg bg-surface-2 px-2.5 py-1">Not this time</span><span className="rounded-lg bg-surface-2 px-2.5 py-1">Pause 30 days</span>
                  </div>
                </div>
              </div>
            </div>
            {err && <p role="alert" className="mt-3 text-sm font-medium text-brand-dark">{err}</p>}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <span className="text-[13px] text-ink-3">{selected} messages, about ${cost}. Replies are tracked automatically.</span>
              <Button variant="wa" size="lg" onClick={send} disabled={busy || loading || selected === 0}>
                {busy ? <><SpinnerGap className="size-5 animate-spin" /> Sending...</> : <>Send to {selected} donors <ArrowRight weight="bold" className="size-5" /></>}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}
