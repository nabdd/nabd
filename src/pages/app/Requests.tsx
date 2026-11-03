import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { MagnifyingGlass, Plus } from '@phosphor-icons/react'
import { Blood, Card, EmptyState, Input, LinkButton, Pill, Segmented, Select, Td, Th } from '@/components/ui'
import { CountUp, EASE } from '@/components/motion'
import { requests, type Urgency } from '@/data/mock'
import { PageHeader } from './AppLayout'

const urgencyPill: Record<Urgency, { tone: 'red' | 'amber' | 'grey'; label: string }> = {
  urgent: { tone: 'red', label: 'Urgent' },
  '24h': { tone: 'amber', label: 'Within 24h' },
  week: { tone: 'grey', label: 'This week' },
}
const rank: Record<Urgency, number> = { urgent: 0, '24h': 1, week: 2 }

export default function Requests() {
  const nav = useNavigate()
  const [tab, setTab] = useState<'open' | 'fulfilled' | 'expired'>('open')
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<'urgency' | 'recent'>('urgency')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 450)
    return () => clearTimeout(t)
  }, [])

  const counts = { open: 3, fulfilled: 41, expired: 6 }
  const rows = useMemo(() => {
    const list = requests.filter((r) => r.status === tab && `${r.type} ${r.component} ${r.hospital}`.toLowerCase().includes(q.toLowerCase()))
    return sort === 'urgency' ? [...list].sort((a, b) => rank[a.urgency] - rank[b.urgency]) : list
  }, [tab, q, sort])

  const stats = [
    { l: 'Open requests', v: 3, pill: <Pill tone="red">2 urgent</Pill> },
    { l: 'Donors notified today', v: 112, pill: <Pill>via WhatsApp</Pill> },
    { l: 'Confirmed donors', v: 19, pill: <Pill tone="green">17% response</Pill> },
    { l: 'Average first reply', v: 9, suffix: ' min', pill: <Pill tone="blue">3 min faster than last week</Pill> },
  ]

  return (
    <>
      <PageHeader title="Requests" sub="Monday, 2 November 2026">
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
                  <CountUp to={s.v} duration={1} />
                  {s.suffix}
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

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <Th>Type</Th><Th>Component</Th><Th>Units</Th><Th>Urgency</Th><Th>Notified</Th><Th>Can donate</Th><Th>Arrived</Th><Th>Created</Th><Th />
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 9 }).map((__, j) => (
                          <Td key={j}><div className="skeleton h-4 w-14" /></Td>
                        ))}
                      </tr>
                    ))
                  : rows.map((r) => (
                      <tr key={r.id} onClick={() => nav(`/app/requests/${r.id}`)} className="cursor-pointer transition-colors hover:bg-surface-2/60" style={{ opacity: r.status === 'open' ? 1 : 0.7 }}>
                        <Td><Blood type={r.type} size="sm" /></Td>
                        <Td>{r.component}</Td>
                        <Td className="tabular-nums">{r.units}</Td>
                        <Td>{r.status === 'fulfilled' ? <Pill>Fulfilled</Pill> : r.status === 'expired' ? <Pill>Expired</Pill> : <Pill tone={urgencyPill[r.urgency].tone}>{urgencyPill[r.urgency].label}</Pill>}</Td>
                        <Td className="tabular-nums">{r.notified}</Td>
                        <Td className="font-bold tabular-nums text-ok">{r.canDonate}</Td>
                        <Td className="tabular-nums">{r.arrived} / {r.units}</Td>
                        <Td className="text-ink-3">{r.created}</Td>
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
          {!loading && rows.length === 0 && (
            <EmptyState
              title={q ? 'No requests match your search' : `No ${tab} requests`}
              body={q ? 'Try a different blood type or hospital name.' : 'When a request changes status it moves here.'}
              action={tab === 'open' ? <LinkButton to="/app/requests/new" size="sm">Post a request</LinkButton> : undefined}
            />
          )}
        </Card>
      </div>
    </>
  )
}
