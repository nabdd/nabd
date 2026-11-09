import { useEffect, useState } from 'react'
import { DotsThree, LinkSimple, LockSimple, MagnifyingGlass, X } from '@phosphor-icons/react'
import { Avatar, Blood, Button, Card, EmptyState, Input, Pill, Select, Td, Th } from '@/components/ui'
import { BLOOD_TYPES, fmtType } from '@/lib/blood'
import { useApi } from '@/lib/api'
import { eligibleLabel, fmtDate } from '@/lib/format'
import type { DirectoryDonor, DonorList, DonorStats } from '@/lib/types'
import { cn } from '@/lib/cn'
import { PageHeader, useToast } from './AppLayout'

const statusTone = { active: 'green', paused: 'grey', opted_out: 'red' } as const
const statusLabel = { active: 'Active', paused: 'Paused', opted_out: 'Opted out' } as const
const PAGE_SIZE = 15

export default function Donors() {
  const toast = useToast()
  const [q, setQ] = useState('')
  const [debounced, setDebounced] = useState('')
  const [type, setType] = useState<string | null>(null)
  const [elig, setElig] = useState<'now' | 'all'>('all')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 300)
    return () => clearTimeout(t)
  }, [q])
  useEffect(() => setPage(1), [debounced, type, elig])

  const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE), eligible: elig })
  if (type) params.set('type', type)
  if (debounced) params.set('q', debounced)
  const list = useApi<DonorList>(`/donors?${params}`)
  const stats = useApi<DonorStats>('/donors/stats')

  const pages = Math.max(1, Math.ceil((list.data?.total ?? 0) / PAGE_SIZE))
  const rows: DirectoryDonor[] = list.data?.items ?? []

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/join`)
      toast('Join link copied')
    } catch {
      toast(`Copy blocked by the browser. The link is ${window.location.origin}/join`, true)
    }
  }

  return (
    <>
      <PageHeader title="Donors" sub={stats.data ? `${stats.data.total.toLocaleString('en-US')} registered, ${stats.data.available.toLocaleString('en-US')} available` : undefined}>
        <div className="relative w-full sm:w-[260px]">
          <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name" aria-label="Search donors" className="h-10 pl-9" />
        </div>
        <Button variant="light" onClick={copyLink}><LinkSimple className="size-4" /> Copy join link</Button>
      </PageHeader>

      <div className="flex flex-col gap-5 p-4 sm:p-9">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={type ?? ''} onChange={(e) => setType(e.target.value || null)} className="h-10 w-[150px]" aria-label="Blood type filter">
            <option value="">All types</option>
            {BLOOD_TYPES.map((t) => <option key={t} value={t}>{fmtType(t)}</option>)}
          </Select>
          <Select value={elig} onChange={(e) => setElig(e.target.value as 'now' | 'all')} className="h-10 w-[170px]" aria-label="Eligibility">
            <option value="all">Any eligibility</option><option value="now">Eligible now</option>
          </Select>
          {type && (
            <button onClick={() => setType(null)} className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1.5 text-xs font-semibold text-brand-dark hover:bg-brand-tint">
              {fmtType(type)}: {stats.data?.byType[type] ?? 0} <X weight="bold" className="size-3" />
            </button>
          )}
          <div className="grid w-full grid-cols-4 gap-1.5 sm:ml-auto sm:w-auto sm:grid-cols-8">
            {BLOOD_TYPES.map((t) => (
              <button key={t} onClick={() => setType(type === t ? null : t)} aria-pressed={type === t}
                className={cn('rounded-control border px-2 py-1.5 text-center transition-colors sm:w-[52px]', type === t ? 'border-brand bg-brand-soft' : 'border-line bg-surface hover:border-ink-3')}>
                <b className={cn('block text-sm', type === t && 'text-brand-dark')}>{fmtType(t)}</b>
                <span className={cn('block text-[11px] tabular-nums', type === t ? 'text-brand-dark' : 'text-ink-3')}>{(stats.data?.byType[t] ?? 0).toLocaleString('en-US')}</span>
              </button>
            ))}
          </div>
        </div>

        <p className="flex items-center gap-1.5 text-[13px] text-ink-3">
          <LockSimple className="size-4" /> Names and numbers stay private until a donor confirms one of your requests.
        </p>

        <Card className="overflow-hidden">
          {list.error ? (
            <EmptyState title="Could not load donors" body={list.error.message} action={<Button size="sm" variant="light" onClick={list.reload}>Try again</Button>} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead><tr><Th>Donor</Th><Th>Type</Th><Th>City</Th><Th>Last donation</Th><Th>Eligible</Th><Th>Response rate</Th><Th>Status</Th><Th /></tr></thead>
                <tbody>
                  {list.loading && !list.data
                    ? Array.from({ length: 5 }).map((_, i) => <tr key={i}>{Array.from({ length: 8 }).map((__, j) => <Td key={j}><div className="skeleton h-4 w-16" /></Td>)}</tr>)
                    : rows.map((d) => (
                        <tr key={d.id} className="transition-colors hover:bg-surface-2/60">
                          <Td><div className="flex items-center gap-3"><Avatar name={d.name} /><div><b>{d.name}</b><div className="text-xs text-ink-3">{d.phone}</div></div></div></Td>
                          <Td><Blood type={d.bloodType} size="sm" /></Td>
                          <Td>{d.city}</Td>
                          <Td className={d.lastDonation ? '' : 'text-ink-3'}>{fmtDate(d.lastDonation)}</Td>
                          <Td><Pill tone={d.eligibleInDays === 0 ? 'green' : 'amber'}>{eligibleLabel(d.eligibleInDays)}</Pill></Td>
                          <Td className={d.responseRate ? 'tabular-nums' : 'text-ink-3'}>{d.responseRate ? `${Math.round((d.responseRate.yes / d.responseRate.total) * 100)}% (${d.responseRate.yes}/${d.responseRate.total})` : 'New'}</Td>
                          <Td><Pill tone={statusTone[d.status]}>{statusLabel[d.status]}</Pill></Td>
                          <Td><button aria-label={`Actions for ${d.name}`} className="flex size-8 items-center justify-center rounded-lg text-ink-3 hover:bg-surface-2 hover:text-ink"><DotsThree weight="bold" className="size-5" /></button></Td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          )}
          {!list.loading && !list.error && rows.length === 0 ? (
            <EmptyState title="No donors match these filters" body="Try another blood type or switch eligibility to any." action={<Button size="sm" variant="light" onClick={() => { setType(null); setElig('all'); setQ('') }}>Clear filters</Button>} />
          ) : (
            list.data && (
              <div className="flex items-center justify-between px-4 py-3.5 text-[13px] text-ink-3">
                <span>Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, list.data.total)} of {list.data.total}</span>
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page">&lsaquo;</Button>
                  <span className="px-2 tabular-nums">{page} / {pages}</span>
                  <Button size="sm" variant="ghost" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} aria-label="Next page">&rsaquo;</Button>
                </div>
              </div>
            )
          )}
        </Card>
      </div>
    </>
  )
}
