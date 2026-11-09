import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { MagnifyingGlass, Plus } from '@phosphor-icons/react'
import { Blood, Button, Card, EmptyState, Input, LinkButton, Pill, Segmented, Select, Td, Th } from '@/components/ui'
import { CountUp, EASE } from '@/components/motion'
import { useApi } from '@/lib/api'
import { timeAgo, urgencyLabel } from '@/lib/format'
import type { Dashboard, RequestList, Urgency } from '@/lib/types'
import { PageHeader } from './AppLayout'

const urgencyTone: Record<Urgency, 'red' | 'amber' | 'grey'> = { urgent: 'red', '24h': 'amber', week: 'grey' }
const rank: Record<Urgency, number> = { urgent: 0, '24h': 1, week: 2 }

export default function Requests() {
  const nav = useNavigate()
  const [tab, setTab] = useState<'open' | 'fulfilled' | 'expired'>('open')
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<'urgency' | 'recent'>('urgency')

  // Live: new replies change the numbers, so refresh every 15 seconds.
  const list = useApi<RequestList>(`/requests?status=${tab}`, 15_000)
  const dash = useApi<Dashboard>('/stats/dashboard', 15_000)
  const counts = list.data?.counts ?? { open: 0, fulfilled: 0, expired: 0 }

  const rows = useMemo(() => {
    const items = (list.data?.items ?? []).filter((r) => `${r.bloodType} ${r.component} ${r.hospital}`.toLowerCase().includes(q.toLowerCase()))
    return sort === 'urgency' ? [...items].sort((a, b) => rank[a.urgency] - rank[b.urgency]) : items
  }, [list.data, q, sort])

  const d = dash.data
  const stats = [
    { l: 'Open requests', v: d?.openRequests, pill: <Pill tone={d?.urgentOpen ? 'red' : 'grey'}>{d?.urgentOpen ?? 0} urgent</Pill> },
    { l: 'Donors notified today', v: d?.notifiedToday, pill: <Pill>via WhatsApp</Pill> },
    { l: 'Confirmed donors today', v: d?.confirmedToday, pill: <Pill tone="green">{d?.responseRateToday ?? 0}% response</Pill> },
    { l: 'Average first reply', v: d?.avgFirstReplyMin ?? undefined, suffix: ' min', pill: <Pill tone="blue">last 7 days</Pill> },
  ]

  return (
    <>
      <PageHeader title="Requests" sub={new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}>
        <div className="relative w-full sm:w-[280px]">
          <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search requests" aria-label="Search requests" className="h-10 pl-9" />
        </div>
        <LinkButton to="/app/requests/new"><Plus weight="bold" className="size-4" /> New request</LinkButton>
      </PageHeader>

      <div className="flex flex-col gap-6 p-4 sm:p-9">
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {stats.map((s, i) => (
            <motion.div key={s.l} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07, duration: 0.5, ease: EASE }}>
              <Card className="h-full p-5">
                <div className="text-[13px] text-ink-3">{s.l}</div>
                <div className="mb-1 mt-1.5 text-3xl font-extrabold tracking-tight tabular-nums">
                  {s.v === undefined ? <span className="text-ink-3">{dash.loading ? <span className="skeleton inline-block h-8 w-12 align-middle" /> : 'n/a'}</span> : <><CountUp key={s.v} to={s.v} duration={0.8} />{s.suffix}</>}
                </div>
                {s.pill}
              </Card>
            </motion.div>
          ))}
        </div>

        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 pb-3">
            <Segmented
              label="Request status"
              className="w-full sm:w-[380px]"
              value={tab}
              onChange={setTab}
              options={[
                { value: 'open', label: `Open (${counts.open})` },
                { value: 'fulfilled', label: `Fulfilled (${counts.fulfilled})` },
                { value: 'expired', label: `Expired (${counts.expired})` },
              ]}
            />
            <label className="flex items-center gap-2 text-[13px] text-ink-3">
              Sort
              <Select value={sort} onChange={(e) => setSort(e.target.value as 'urgency' | 'recent')} className="h-9 w-[130px] text-[13px] font-semibold" aria-label="Sort requests">
                <option value="urgency">Urgency</option>
                <option value="recent">Newest</option>
              </Select>
            </label>
          </div>

          {list.error ? (
            <EmptyState title="Could not load requests" body={list.error.message} action={<Button size="sm" variant="light" onClick={list.reload}>Try again</Button>} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr><Th>Type</Th><Th>Component</Th><Th>Units</Th><Th>Urgency</Th><Th>Notified</Th><Th>Can donate</Th><Th>Arrived</Th><Th>Created</Th><Th /></tr>
                </thead>
                <tbody>
                  {list.loading && !list.data
                    ? Array.from({ length: 3 }).map((_, i) => (
                        <tr key={i}>{Array.from({ length: 9 }).map((__, j) => <Td key={j}><div className="skeleton h-4 w-14" /></Td>)}</tr>
                      ))
                    : rows.map((r) => (
                        <tr key={r.id} onClick={() => nav(`/app/requests/${r.id}`)} className="cursor-pointer transition-colors hover:bg-surface-2/60" style={{ opacity: r.status === 'open' ? 1 : 0.7 }}>
                          <Td><Blood type={r.bloodType} size="sm" /></Td>
                          <Td>{r.component}</Td>
                          <Td className="tabular-nums">{r.units}</Td>
                          <Td>{r.status === 'open' ? <Pill tone={urgencyTone[r.urgency]}>{urgencyLabel[r.urgency]}</Pill> : <Pill>{r.status === 'fulfilled' ? 'Fulfilled' : 'Expired'}</Pill>}</Td>
                          <Td className="tabular-nums">{r.notified}</Td>
                          <Td className="font-bold tabular-nums text-ok">{r.canDonate}</Td>
                          <Td className="tabular-nums">{r.arrived} / {r.units}</Td>
                          <Td className="text-ink-3">{timeAgo(r.createdAt)}</Td>
                          <Td>
                            <Link to={`/app/requests/${r.id}`} onClick={(e) => e.stopPropagation()} className={r.status === 'open' ? 'inline-flex h-9 items-center rounded-control bg-brand-soft px-3.5 text-[13px] font-semibold text-brand-dark hover:bg-brand-tint' : 'inline-flex h-9 items-center rounded-control border border-line px-3.5 text-[13px] font-semibold hover:bg-surface-2'}>
                              {r.status === 'open' ? 'Open' : 'View'}
                            </Link>
                          </Td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          )}
          {!list.loading && !list.error && rows.length === 0 && (
            <EmptyState
              title={q ? 'No requests match your search' : `No ${tab} requests`}
              body={q ? 'Try a different blood type or component.' : 'When a request changes status it moves here.'}
              action={tab === 'open' ? <LinkButton to="/app/requests/new" size="sm">Post a request</LinkButton> : undefined}
            />
          )}
        </Card>
      </div>
    </>
  )
}
