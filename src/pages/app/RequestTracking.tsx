import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Avatar, Blood, Button, Card, EmptyState, Pill, Segmented, Td, Th } from '@/components/ui'
import { CountUp, EASE } from '@/components/motion'
import { activity, requests, responses as seed, type ResponseStatus } from '@/data/mock'
import { cn } from '@/lib/cn'
import { fmtType } from '@/lib/blood'
import { PageHeader, useToast } from './AppLayout'

const dot = { ok: 'bg-ok', info: 'bg-info', warn: 'bg-warn', mute: 'bg-ink-3', wa: 'bg-wa' } as const
const statusPill: Record<ResponseStatus, { tone: 'green' | 'blue' | 'amber' | 'grey'; label: string }> = {
  donated: { tone: 'green', label: 'Donated' },
  enroute: { tone: 'blue', label: 'En route' },
  confirmed: { tone: 'amber', label: 'Confirmed' },
  later: { tone: 'grey', label: 'Later' },
}

export default function RequestTracking() {
  const { id } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const req = requests.find((r) => r.id === id) ?? requests[0]
  const [tab, setTab] = useState<'yes' | 'no' | 'pending'>('yes')
  const [rows, setRows] = useState(seed)
  const [expanded, setExpanded] = useState(false)

  const collected = rows.filter((r) => r.status === 'donated').length
  const pct = Math.min(100, Math.round((collected / req.units) * 100))
  const notYes = req.notified - rows.length
  const stats = useMemo(() => ({ no: Math.round(notYes * 0.43), pending: notYes - Math.round(notYes * 0.43) }), [notYes])

  const markArrived = (rid: string) => {
    setRows((rs) => rs.map((r) => (r.id === rid ? { ...r, status: 'donated', eta: 'Arrived just now' } : r)))
    toast('Donation recorded, 1 unit added')
  }

  return (
    <>
      <PageHeader
        crumb={<div className="text-[13px] text-ink-3"><Link to="/app" className="hover:text-ink">Requests</Link> / </div>}
        title={
          <>
            {fmtType(req.type)}, {req.component}, {req.units} {req.units === 1 ? 'unit' : 'units'}
            <Pill tone={req.urgency === 'urgent' ? 'red' : 'amber'}>{req.urgency === 'urgent' ? 'Urgent' : 'Within 24h'}</Pill>
            <Pill tone="green"><span className="size-1.5 animate-pulse rounded-full bg-ok" /> Live</Pill>
          </>
        }
      >
        <Button variant="ghost" size="sm" onClick={() => toast('Reminder sent to 12 donors who have not replied')}>Send reminder</Button>
        <Button variant="ghost" size="sm" onClick={() => nav('/app/requests/new')}>Add more donors</Button>
        <Button size="sm" onClick={() => { toast('Request marked as fulfilled'); nav('/app') }}>Mark fulfilled</Button>
      </PageHeader>

      <div className="flex flex-col gap-6 p-4 sm:p-9">
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <Card className="p-5"><div className="text-[13px] text-ink-3">Sent</div><div className="mb-1 mt-1.5 text-3xl font-extrabold tracking-tight tabular-nums"><CountUp to={req.notified} duration={1} /></div><Pill>{req.notified} delivered, {req.notified - 3} read</Pill></Card>
          <Card className="p-5"><div className="text-[13px] text-ink-3">Can donate</div><div className="mb-1 mt-1.5 text-3xl font-extrabold tracking-tight tabular-nums text-ok"><CountUp to={rows.length} duration={1} /></div><Pill tone="green">{Math.round((rows.length / req.notified) * 100)}% response</Pill></Card>
          <Card className="p-5"><div className="text-[13px] text-ink-3">Not this time</div><div className="mb-1 mt-1.5 text-3xl font-extrabold tracking-tight tabular-nums"><CountUp to={stats.no} duration={1} /></div><Pill>{stats.pending} no reply yet</Pill></Card>
          <Card className="p-5">
            <div className="text-[13px] text-ink-3">Units collected</div>
            <div className="mb-2 mt-1.5 text-3xl font-extrabold tracking-tight tabular-nums">{collected}<span className="text-lg font-semibold text-ink-3"> / {req.units}</span></div>
            <div className="h-2 rounded-full bg-line" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Units collected">
              <motion.div className="h-full rounded-full bg-brand" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: EASE }} />
            </div>
          </Card>
        </div>

        <div className="flex flex-col items-start gap-6 xl:flex-row">
          <Card className="w-full min-w-0 flex-[1.4] overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
              <h2 className="text-lg font-bold">Responses</h2>
              <Segmented<'yes' | 'no' | 'pending'> label="Response filter" className="w-full sm:w-[380px]" value={tab} onChange={setTab}
                options={[{ value: 'yes', label: `Can donate (${rows.length})` }, { value: 'no', label: `No (${stats.no})` }, { value: 'pending', label: `Pending (${stats.pending})` }]} />
            </div>
            {tab === 'yes' ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead><tr><Th>Donor</Th><Th>Type</Th><Th>Replied</Th><Th>ETA</Th><Th>Status</Th><Th /></tr></thead>
                  <tbody>
                    <AnimatePresence initial={false}>
                      {rows.map((r) => (
                        <motion.tr key={r.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                          <Td><div className="flex items-center gap-3"><Avatar name={r.name} /><b>{r.name}</b></div></Td>
                          <Td><Blood type={r.type} size="sm" /></Td>
                          <Td className="text-ink-3">{r.replied}</Td>
                          <Td>{r.eta}</Td>
                          <Td><Pill tone={statusPill[r.status].tone}>{statusPill[r.status].label}</Pill></Td>
                          <Td>
                            {r.status === 'enroute' ? <Button size="sm" variant="light" onClick={() => markArrived(r.id)}>Mark arrived</Button>
                              : r.status === 'donated' ? <Button size="sm" variant="ghost" onClick={() => toast('Receipt sent to the donor')}>Receipt</Button>
                              : <Button size="sm" variant={r.eta.startsWith('Asked') ? 'light' : 'ghost'} onClick={() => toast(r.eta.startsWith('Asked') ? 'Reply sent: Main entrance, Building C' : `Message sent to ${r.name}`)}>{r.eta.startsWith('Asked') ? 'Reply' : 'Message'}</Button>}
                          </Td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title={tab === 'no' ? `${stats.no} donors said not this time` : `${stats.pending} donors have not replied yet`}
                body={tab === 'no' ? 'They are skipped for this request and stay on your list for the next one.' : 'Send a reminder or widen the radius to reach more people.'}
                action={tab === 'pending' ? <Button size="sm" variant="light" onClick={() => toast(`Reminder sent to ${stats.pending} donors`)}>Send reminder</Button> : undefined}
              />
            )}
          </Card>

          <div className="flex w-full flex-1 flex-col gap-4">
            <Card className="p-5">
              <h2 className="mb-3.5 text-lg font-bold">Activity</h2>
              <ul className="flex flex-col gap-3.5 text-[13px]">
                {activity.map((a) => (
                  <li key={a.text} className="flex items-start gap-2.5">
                    <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', dot[a.tone])} />
                    <div>
                      {a.text}
                      <div className="text-ink-3">{a.time}{'flag' in a && <> , <b className="text-brand-dark">{a.flag}</b></>}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="p-5">
              <h2 className="mb-2 text-lg font-bold">Still short by {Math.max(0, req.units - collected)} units?</h2>
              <p className="mb-3 text-[13px] leading-relaxed text-ink-2">Expand to 30 km or include donors eligible within 7 days. {expanded ? '0' : '23'} more donors would be notified.</p>
              <Button variant="wa" block disabled={expanded} onClick={() => { setExpanded(true); toast('Sent to 23 more donors') }}>
                {expanded ? 'Sent to 23 more donors' : 'Send to 23 more donors'}
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}
