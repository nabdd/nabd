import { useMemo, useState } from 'react'
import { DotsThree, DownloadSimple, LinkSimple, MagnifyingGlass, Plus, X } from '@phosphor-icons/react'
import { Avatar, Blood, Button, Card, EmptyState, Input, Pill, Select, Td, Th } from '@/components/ui'
import { BLOOD_TYPES, fmtType } from '@/lib/blood'
import { donors, typeCounts } from '@/data/mock'
import { cn } from '@/lib/cn'
import { PageHeader, useToast } from './AppLayout'

const statusTone = { Active: 'green', 'En route': 'blue', 'Paused 30d': 'grey', 'Opted out': 'red' } as const

export default function Donors() {
  const toast = useToast()
  const [q, setQ] = useState('')
  const [type, setType] = useState<string | null>('O-')
  const [elig, setElig] = useState('now')

  const rows = useMemo(
    () => donors.filter((d) => (!type || d.type === type) && (elig === 'all' || d.eligible === 'Now') && `${d.name} ${d.phone}`.toLowerCase().includes(q.toLowerCase())),
    [q, type, elig],
  )

  async function copyLink() {
    try {
      await navigator.clipboard.writeText('https://nabd.lb/join/aubmc')
      toast('Join link copied')
    } catch {
      toast('Copy blocked by the browser. The link is nabd.lb/join/aubmc')
    }
  }

  return (
    <>
      <PageHeader title="Donors" sub="8,420 registered, 6,118 available">
        <div className="relative w-full sm:w-[260px]">
          <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or phone" aria-label="Search donors" className="h-10 pl-9" />
        </div>
        <Button variant="ghost" onClick={() => toast('Export started. The CSV will download shortly')}><DownloadSimple className="size-4" /> Export</Button>
        <Button variant="light" onClick={copyLink}><LinkSimple className="size-4" /> Copy join link</Button>
        <Button onClick={() => toast('Add donor form is not part of this demo')}><Plus weight="bold" className="size-4" /> Add donor</Button>
      </PageHeader>

      <div className="flex flex-col gap-5 p-4 sm:p-9">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={type ?? ''} onChange={(e) => setType(e.target.value || null)} className="h-10 w-[150px]" aria-label="Blood type filter">
            <option value="">All types</option>
            {BLOOD_TYPES.map((t) => <option key={t} value={t}>{fmtType(t)}</option>)}
          </Select>
          <Select defaultValue="20" className="h-10 w-[150px]" aria-label="Distance"><option value="20">Within 20 km</option><option>Within 50 km</option></Select>
          <Select value={elig} onChange={(e) => setElig(e.target.value)} className="h-10 w-[160px]" aria-label="Eligibility">
            <option value="now">Eligible now</option><option value="all">Any eligibility</option>
          </Select>
          {type && (
            <button onClick={() => setType(null)} className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1.5 text-xs font-semibold text-brand-dark hover:bg-brand-tint">
              {fmtType(type)}: {typeCounts[type]} <X weight="bold" className="size-3" />
            </button>
          )}
          <div className="grid w-full grid-cols-4 gap-1.5 sm:ml-auto sm:w-auto sm:grid-cols-8">
            {BLOOD_TYPES.map((t) => (
              <button key={t} onClick={() => setType(type === t ? null : t)} aria-pressed={type === t}
                className={cn('rounded-control border px-2 py-1.5 text-center transition-colors sm:w-[52px]', type === t ? 'border-brand bg-brand-soft' : 'border-line bg-surface hover:border-ink-3')}>
                <b className={cn('block text-sm', type === t && 'text-brand-dark')}>{fmtType(t)}</b>
                <span className={cn('block text-[11px] tabular-nums', type === t ? 'text-brand-dark' : 'text-ink-3')}>{typeCounts[t].toLocaleString('en-US')}</span>
              </button>
            ))}
          </div>
        </div>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead><tr><Th>Donor</Th><Th>Type</Th><Th>Area</Th><Th>Last donation</Th><Th>Eligible</Th><Th>Response rate</Th><Th>Status</Th><Th /></tr></thead>
              <tbody>
                {rows.map((d) => (
                  <tr key={d.id} className="transition-colors hover:bg-surface-2/60">
                    <Td><div className="flex items-center gap-3"><Avatar name={d.name} /><div><b>{d.name}</b><div className="text-xs text-ink-3">{d.phone}</div></div></div></Td>
                    <Td><Blood type={d.type} size="sm" /></Td>
                    <Td>{d.area}</Td>
                    <Td className={d.last === 'Never' ? 'text-ink-3' : ''}>{d.last}</Td>
                    <Td><Pill tone={d.eligibleTone}>{d.eligible}</Pill></Td>
                    <Td className={d.rate === 'New' ? 'text-ink-3' : ''}>{d.rate}</Td>
                    <Td><Pill tone={statusTone[d.status]}>{d.status}</Pill></Td>
                    <Td><button aria-label={`Actions for ${d.name}`} className="flex size-8 items-center justify-center rounded-lg text-ink-3 hover:bg-surface-2 hover:text-ink"><DotsThree weight="bold" className="size-5" /></button></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length === 0 ? (
            <EmptyState title="No donors match these filters" body="Try another blood type or switch eligibility to any." action={<Button size="sm" variant="light" onClick={() => { setType(null); setElig('all'); setQ('') }}>Clear filters</Button>} />
          ) : (
            <div className="flex items-center justify-between px-4 py-3.5 text-[13px] text-ink-3">
              <span>Showing {rows.length} of {type ? typeCounts[type] : '8,420'}</span>
              <div className="flex gap-1.5">
                <Button size="sm" variant="ghost" disabled aria-label="Previous page">&lsaquo;</Button>
                <Button size="sm" variant="light">1</Button>
                <Button size="sm" variant="ghost">2</Button>
                <Button size="sm" variant="ghost">3</Button>
                <Button size="sm" variant="ghost" aria-label="Next page">&rsaquo;</Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </>
  )
}
