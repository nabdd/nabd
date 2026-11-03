import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowRight, SpinnerGap, WhatsappLogo } from '@phosphor-icons/react'
import { Avatar, Blood, Button, Card, Checkbox, Field, Input, Pill, Segmented, Select, Td, Th } from '@/components/ui'
import { BLOOD_TYPES, fmtType, type BloodType } from '@/lib/blood'
import { matchDonors } from '@/data/mock'
import { cn } from '@/lib/cn'
import { PageHeader, useToast } from './AppLayout'

type Urg = 'urgent' | '24h' | 'week'
const radiusTotals: Record<string, number> = { '5': 14, '10': 24, '20': 38, '30': 61 }
const urgText: Record<Urg, string> = { urgent: 'within 4 hours', '24h': 'within 24 hours', week: 'this week' }

export default function NewRequest() {
  const nav = useNavigate()
  const toast = useToast()
  const [type, setType] = useState<BloodType>('O-')
  const [compat, setCompat] = useState(true)
  const [component, setComponent] = useState('Whole blood')
  const [units, setUnits] = useState('3')
  const [urgency, setUrgency] = useState<Urg>('urgent')
  const [ref, setRef] = useState('ER-2211-0347')
  const [note, setNote] = useState('Emergency surgery. Please come to the Blood Bank, Ground floor, Building C. Bring your ID.')
  const [radius, setRadius] = useState('20')
  const [picked, setPicked] = useState<Record<string, boolean>>(() => Object.fromEntries(matchDonors.map((d) => [d.id, d.selected])))
  const [others, setOthers] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const total = radiusTotals[radius]
  const remaining = Math.max(0, total - 11)
  const rowsSelected = matchDonors.filter((d) => picked[d.id]).length
  const selected = rowsSelected + (others ? remaining : 0)
  const allOn = rowsSelected === matchDonors.length && others
  const cost = (selected * 0.03).toFixed(2)
  const unitsN = Math.max(1, Number(units) || 1)

  const counts = useMemo(() => ({ exact: Math.round(total * 0.29), comp: Math.round(total * 0.71), prev: Math.round(total * 0.5), near: Math.round(total * 0.37) }), [total])

  function toggleAll(v: boolean) {
    setPicked(Object.fromEntries(matchDonors.map((d) => [d.id, v])))
    setOthers(v)
  }

  function send() {
    if (!Number(units) || Number(units) < 1) return setErr('Enter how many units you need.')
    if (selected === 0) return setErr('Select at least one donor to contact.')
    setErr('')
    setBusy(true)
    setTimeout(() => {
      toast(`Request sent to ${selected} donors on WhatsApp`)
      nav('/app/requests/r1')
    }, 1100)
  }

  return (
    <>
      <PageHeader crumb={<div className="text-[13px] text-ink-3"><Link to="/app" className="hover:text-ink">Requests</Link> / </div>} title="New request">
        <Button variant="ghost" onClick={() => toast('Draft saved')}>Save draft</Button>
      </PageHeader>

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
            <Segmented<Urg> label="Urgency" value={urgency} onChange={setUrgency} options={[{ value: 'urgent', label: 'Urgent (up to 4h)' }, { value: '24h', label: 'Within 24h' }, { value: 'week', label: 'This week' }]} />
          </Field>
          <Field label="Patient reference (internal)" htmlFor="ref">
            <Input id="ref" value={ref} onChange={(e) => setRef(e.target.value)} />
          </Field>
          <Field label="Note to donors (optional)" htmlFor="note">
            <textarea id="note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} className="w-full resize-none rounded-control border border-line bg-surface px-3.5 py-3 text-sm leading-relaxed focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25" />
          </Field>

          <h2 className="pt-1 text-lg font-bold">2. Who should we contact?</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Radius" htmlFor="radius">
              <Select id="radius" value={radius} onChange={(e) => setRadius(e.target.value)}>
                <option value="5">5 km</option><option value="10">10 km</option><option value="20">20 km</option><option value="30">30 km</option>
              </Select>
            </Field>
            <Field label="Eligibility" htmlFor="elig">
              <Select id="elig" defaultValue="56"><option value="56">56+ days since last</option><option value="30">30+ days since last</option></Select>
            </Field>
          </div>
        </Card>

        {/* ---- matches + preview ---- */}
        <div className="flex w-full min-w-0 flex-1 flex-col gap-4">
          <Card className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <motion.div key={total} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-lg font-bold">{total} matching donors found</motion.div>
                <div className="text-[13px] text-ink-3">{fmtType(type)}{compat ? ' and compatible' : ''} donors within {radius} km of AUBMC, eligible to donate</div>
              </div>
              <Pill tone="green">Live</Pill>
            </div>
            <div className="mt-3.5 flex flex-wrap gap-2">
              <Pill tone="red">{fmtType(type)}: {counts.exact}</Pill>
              {compat && <Pill>Compatible: {counts.comp}</Pill>}
              <Pill tone="blue">Responded before: {counts.prev}</Pill>
              <Pill>Within 5 km: {counts.near}</Pill>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-3 text-[13px]">
              <Checkbox checked={allOn} onChange={toggleAll} label={<span><b>{selected} selected</b> <span className="text-ink-3">of {total}</span></span>} />
              <span className="text-ink-3">Sorted by distance</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead><tr><Th className="w-11" /><Th>Donor</Th><Th>Type</Th><Th>Distance</Th><Th>Last donation</Th><Th>Past responses</Th><Th>Status</Th></tr></thead>
                <tbody>
                  {matchDonors.map((d) => (
                    <tr key={d.id} className={cn('transition-opacity', !picked[d.id] && 'opacity-60')}>
                      <Td><Checkbox checked={!!picked[d.id]} onChange={(v) => setPicked((p) => ({ ...p, [d.id]: v }))} label={<span className="sr-only">Select {d.name}</span>} /></Td>
                      <Td><div className="flex items-center gap-3"><Avatar name={d.name} /><div><b>{d.name}</b><div className="text-xs text-ink-3">{d.phone}</div></div></div></Td>
                      <Td><Blood type={d.type} size="sm" /></Td>
                      <Td className="tabular-nums">{d.distance} km</Td>
                      <Td className={d.last === 'Never' ? 'text-ink-3' : ''}>{d.last}</Td>
                      <Td><Pill tone={d.tone}>{d.responses}</Pill></Td>
                      <Td><Pill tone={d.eligibleTone}>{d.eligible}</Pill></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-center gap-3 px-4 py-3 text-[13px] text-ink-3">
              Showing 6 of {total}
              <Checkbox checked={others} onChange={setOthers} label={<span>Include the other {remaining}</span>} />
            </div>
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
                  Hi {'{{name}}'}, <b>AUBMC Blood Bank</b> {urgency === 'urgent' ? 'urgently ' : ''}needs <b>{fmtType(type)} {component.toLowerCase()}</b> ({unitsN} {unitsN === 1 ? 'unit' : 'units'}) {urgText[urgency]}. You are 1.2 km away.
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
              <Button variant="wa" size="lg" onClick={send} disabled={busy}>
                {busy ? <><SpinnerGap className="size-5 animate-spin" /> Sending...</> : <>Send to {selected} donors <ArrowRight weight="bold" className="size-5" /></>}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}
