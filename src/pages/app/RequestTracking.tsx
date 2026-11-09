import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { Avatar, Blood, Button, Card, EmptyState, Pill, Segmented, Td, Th } from '@/components/ui'
import { CountUp, EASE } from '@/components/motion'
import { api, ApiError, useApi } from '@/lib/api'
import { cn } from '@/lib/cn'
import { fmtType } from '@/lib/blood'
import { fmtTime, urgencyLabel } from '@/lib/format'
import type { RequestDetail, ResponseStatus } from '@/lib/types'
import { PageHeader, useToast } from './AppLayout'

const dot: Record<string, string> = { donated: 'bg-ok', fulfilled: 'bg-ok', enroute: 'bg-info', confirmed: 'bg-info', question: 'bg-warn', declined: 'bg-ink-3', sent: 'bg-wa', reminder: 'bg-wa' }
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
  const [tab, setTab] = useState<'yes' | 'no' | 'pending'>('yes')
  const [busy, setBusy] = useState<string | null>(null)
  // Replies arrive from WhatsApp at any moment, so poll while the page is open.
  const { data, error, loading, reload } = useApi<RequestDetail>(`/requests/${id}`, 8_000)

  async function act(key: string, path: string, method: 'POST' | 'PATCH', ok: (r: any) => string, after?: () => void) {
    setBusy(key)
    try {
      const r = await api<any>(path, { method })
      toast(ok(r))
      reload()
      after?.()
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Something went wrong', true)
    } finally {
      setBusy(null)
    }
  }

  if (error && !data) {
    return (
      <>
        <PageHeader title="Request" />
        <div className="p-4 sm:p-9"><Card><EmptyState title={error.status === 404 ? 'Request not found' : 'Could not load this request'} body={error.message} action={<Link to="/app" className="text-sm font-semibold text-brand-dark hover:underline">Back to requests</Link>} /></Card></div>
      </>
    )
  }
  if (!data) {
    return (
      <>
        <PageHeader title={<span className="skeleton inline-block h-6 w-64" />} />
        <div className="grid grid-cols-2 gap-4 p-4 sm:p-9 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-28 rounded-card" />)}</div>
      </>
    )
  }

  const { request: req, stats, responses, activity } = data
  const open = req.status === 'open'
  const pct = Math.min(100, Math.round((stats.collected / req.units) * 100))
  void loading

  return (
    <>
      <PageHeader
        crumb={<div className="text-[13px] text-ink-3"><Link to="/app" className="hover:text-ink">Requests</Link> / </div>}
        title={
          <>
            {fmtType(req.bloodType)}, {req.component}, {req.units} {req.units === 1 ? 'unit' : 'units'}
            {open ? <Pill tone={req.urgency === 'urgent' ? 'red' : 'amber'}>{urgencyLabel[req.urgency]}</Pill> : <Pill>{req.status === 'fulfilled' ? 'Fulfilled' : 'Expired'}</Pill>}
            {open && <Pill tone="green"><span className="size-1.5 animate-pulse rounded-full bg-ok" /> Live</Pill>}
          </>
        }
      >
        {open && (
          <>
            <Button variant="ghost" size="sm" disabled={busy === 'remind'} onClick={() => act('remind', `/requests/${id}/remind`, 'POST', (r) => `Reminder sent to ${r.reminded} donors`)}>Send reminder</Button>
            <Button variant="ghost" size="sm" onClick={() => nav('/app/requests/new')}>Add more donors</Button>
            <Button size="sm" disabled={busy === 'fulfill'} onClick={() => act('fulfill', `/requests/${id}/fulfill`, 'PATCH', () => 'Request marked as fulfilled', () => nav('/app'))}>Mark fulfilled</Button>
          </>
        )}
      </PageHeader>

      <div className="flex flex-col gap-6 p-4 sm:p-9">
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <Card className="p-5"><div className="text-[13px] text-ink-3">Sent</div><div className="mb-1 mt-1.5 text-3xl font-extrabold tracking-tight tabular-nums"><CountUp key={stats.sent} to={stats.sent} duration={0.8} /></div><Pill>{stats.responseRate}% replied</Pill></Card>
          <Card className="p-5"><div className="text-[13px] text-ink-3">Can donate</div><div className="mb-1 mt-1.5 text-3xl font-extrabold tracking-tight tabular-nums text-ok"><CountUp key={stats.canDonate} to={stats.canDonate} duration={0.8} /></div><Pill tone="green">{stats.sent ? Math.round((stats.canDonate / stats.sent) * 100) : 0}% of sent</Pill></Card>
          <Card className="p-5"><div className="text-[13px] text-ink-3">Not this time</div><div className="mb-1 mt-1.5 text-3xl font-extrabold tracking-tight tabular-nums"><CountUp key={stats.declined} to={stats.declined} duration={0.8} /></div><Pill>{stats.pending} no reply yet</Pill></Card>
          <Card className="p-5">
            <div className="text-[13px] text-ink-3">Units collected</div>
            <div className="mb-2 mt-1.5 text-3xl font-extrabold tracking-tight tabular-nums">{stats.collected}<span className="text-lg font-semibold text-ink-3"> / {req.units}</span></div>
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
                options={[{ value: 'yes', label: `Can donate (${stats.canDonate})` }, { value: 'no', label: `No (${stats.declined})` }, { value: 'pending', label: `Pending (${stats.pending})` }]} />
            </div>
            {tab === 'yes' ? (
              responses.length === 0 ? (
                <EmptyState title="No replies yet" body="Donors answer on WhatsApp. They appear here the moment they say yes." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead><tr><Th>Donor</Th><Th>Type</Th><Th>Replied</Th><Th>ETA</Th><Th>Status</Th><Th /></tr></thead>
                    <tbody>
                      {responses.map((r) => (
                        <tr key={r.id}>
                          <Td><div className="flex items-center gap-3"><Avatar name={r.fullName} /><div><b>{r.fullName}</b><div className="text-xs text-ink-3">{r.phone}{r.receptionCode && ` · ${r.receptionCode}`}</div></div></div></Td>
                          <Td><Blood type={r.bloodType} size="sm" /></Td>
                          <Td className="text-ink-3">{r.repliedAfterMin == null ? '' : r.repliedAfterMin < 1 ? 'under 1 min' : `${r.repliedAfterMin} min after send`}</Td>
                          <Td>{r.eta ?? 'Time not chosen yet'}</Td>
                          <Td><Pill tone={statusPill[r.status].tone}>{statusPill[r.status].label}</Pill></Td>
                          <Td>
                            {open && r.status !== 'donated' ? (
                              <Button size="sm" variant="light" disabled={busy === `a${r.id}`} onClick={() => act(`a${r.id}`, `/requests/${id}/responses/${r.id}/arrived`, 'POST', () => 'Donation recorded, 1 unit added')}>Mark arrived</Button>
                            ) : null}
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              <EmptyState
                title={tab === 'no' ? `${stats.declined} donors said not this time` : `${stats.pending} donors have not replied yet`}
                body={tab === 'no' ? 'They are skipped for this request and stay on your list for the next one.' : 'Send a reminder or widen the radius to reach more people.'}
                action={tab === 'pending' && open ? <Button size="sm" variant="light" onClick={() => act('remind', `/requests/${id}/remind`, 'POST', (r) => `Reminder sent to ${r.reminded} donors`)}>Send reminder</Button> : undefined}
              />
            )}
          </Card>

          <div className="flex w-full flex-1 flex-col gap-4">
            <Card className="p-5">
              <h2 className="mb-3.5 text-lg font-bold">Activity</h2>
              {activity.length === 0 ? (
                <p className="text-[13px] text-ink-3">Nothing yet.</p>
              ) : (
                <ul className="flex flex-col gap-3.5 text-[13px]">
                  {activity.map((a, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', dot[a.kind] ?? 'bg-ink-3')} />
                      <div>
                        {a.text}
                        <div className="text-ink-3">{fmtTime(a.at)}{a.flag && <> , <b className="text-brand-dark">{a.flag}</b></>}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            {open && (
              <Card className="p-5">
                <h2 className="mb-2 text-lg font-bold">Still short by {Math.max(0, req.units - stats.collected)} units?</h2>
                <p className="mb-3 text-[13px] leading-relaxed text-ink-2">
                  {data.expandable > 0 ? `Expand to 30 km and include donors eligible within 7 days. ${data.expandable} more donors would be notified.` : 'Everyone in range has already been contacted.'}
                </p>
                <Button variant="wa" block disabled={data.expandable === 0 || busy === 'expand'} onClick={() => act('expand', `/requests/${id}/expand`, 'POST', (r) => `Sent to ${r.sent} more donors`)}>
                  {data.expandable > 0 ? `Send to ${data.expandable} more donors` : 'No more donors to contact'}
                </Button>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
