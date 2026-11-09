import { BadRequestException, Injectable } from '@nestjs/common'
import type { AuthedHospital } from '../common/auth.decorators'
import { DatabaseService } from '../database/database.service'
import { POSITIVE } from '../database/schema'
import { RequestsService } from '../requests/requests.service'

const DAY = 86_400_000
const MAX_DAYS = 366
const pos = POSITIVE.map((s) => `'${s}'`).join(',')
const isoDay = (t: number) => new Date(t).toISOString().slice(0, 10)

interface Row {
  id: number
  blood_type: string
  component: string
  units: number
  urgency: string
  status: string
  patient_ref: string | null
  created_at: string
  notified: number
  replied: number
  can_donate: number
  collected: number
}

/** Stops spreadsheet apps from running a cell as a formula. */
function csvCell(v: string | number | null) {
  let s = v == null ? '' : String(v)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly requests: RequestsService,
  ) {}

  /** Dates are whole days in UTC, both ends included. Defaults to the last 30 days. */
  range(from?: string, to?: string) {
    const toDay = to ?? isoDay(Date.now())
    const fromDay = from ?? isoDay(new Date(`${toDay}T00:00:00Z`).getTime() - 29 * DAY)
    for (const d of [fromDay, toDay]) {
      if (Number.isNaN(Date.parse(`${d}T00:00:00Z`)) || isoDay(Date.parse(`${d}T00:00:00Z`)) !== d) throw new BadRequestException(`${d} is not a real date`)
    }
    if (fromDay > toDay) throw new BadRequestException('"from" must be on or before "to"')
    const days = (Date.parse(`${toDay}T00:00:00Z`) - Date.parse(`${fromDay}T00:00:00Z`)) / DAY + 1
    if (days > MAX_DAYS) throw new BadRequestException(`Pick at most ${MAX_DAYS} days`)
    return { from: fromDay, to: toDay, days, start: `${fromDay}T00:00:00.000Z`, end: `${toDay}T23:59:59.999Z` }
  }

  private rows(h: AuthedHospital, start: string, end: string) {
    this.requests.expireOld(h.id)
    return this.db.all<Row>(
      `SELECT r.id, r.blood_type, r.component, r.units, r.urgency, r.status, r.patient_ref, r.created_at,
         (SELECT COUNT(*) FROM request_donors WHERE request_id = r.id AND status != 'failed') AS notified,
         (SELECT COUNT(*) FROM request_donors WHERE request_id = r.id AND status NOT IN ('sent','failed')) AS replied,
         (SELECT COUNT(*) FROM request_donors WHERE request_id = r.id AND status IN (${pos})) AS can_donate,
         (SELECT COUNT(*) FROM request_donors WHERE request_id = r.id AND status = 'donated') AS collected
       FROM requests r WHERE r.hospital_id = ? AND r.created_at BETWEEN ? AND ?
       ORDER BY r.created_at`,
      h.id, start, end,
    )
  }

  summary(h: AuthedHospital, from?: string, to?: string) {
    const range = this.range(from, to)
    const rows = this.rows(h, range.start, range.end)
    const sum = (f: (r: Row) => number) => rows.reduce((s, r) => s + f(r), 0)
    const notified = sum((r) => r.notified)

    const replies = this.db.all<{ sent_at: string; replied_at: string }>(
      `SELECT rd.sent_at, rd.replied_at FROM request_donors rd JOIN requests r ON r.id = rd.request_id
       WHERE r.hospital_id = ? AND r.created_at BETWEEN ? AND ? AND rd.replied_at IS NOT NULL`,
      h.id, range.start, range.end,
    )
    const avgReply = replies.length ? replies.reduce((s, x) => s + (Date.parse(x.replied_at) - Date.parse(x.sent_at)), 0) / replies.length / 60_000 : null

    const byType = new Map<string, { bloodType: string; requests: number; unitsRequested: number; unitsCollected: number }>()
    const daily = new Map<string, { date: string; requests: number; unitsCollected: number }>()
    for (let i = 0; i < range.days; i++) {
      const date = isoDay(Date.parse(range.start) + i * DAY)
      daily.set(date, { date, requests: 0, unitsCollected: 0 })
    }
    for (const r of rows) {
      const t = byType.get(r.blood_type) ?? { bloodType: r.blood_type, requests: 0, unitsRequested: 0, unitsCollected: 0 }
      t.requests++
      t.unitsRequested += r.units
      t.unitsCollected += r.collected
      byType.set(r.blood_type, t)
      const d = daily.get(r.created_at.slice(0, 10))
      if (d) {
        d.requests++
        d.unitsCollected += r.collected
      }
    }

    return {
      from: range.from,
      to: range.to,
      requests: {
        total: rows.length,
        open: rows.filter((r) => r.status === 'open').length,
        fulfilled: rows.filter((r) => r.status === 'fulfilled').length,
        expired: rows.filter((r) => r.status === 'expired').length,
      },
      units: { requested: sum((r) => r.units), collected: sum((r) => r.collected) },
      donors: { notified, replied: sum((r) => r.replied), canDonate: sum((r) => r.can_donate) },
      responseRate: notified ? Math.round((sum((r) => r.replied) / notified) * 100) : 0,
      confirmRate: notified ? Math.round((sum((r) => r.can_donate) / notified) * 100) : 0,
      avgFirstReplyMin: avgReply == null ? null : Math.round(avgReply),
      byBloodType: [...byType.values()].sort((a, b) => b.requests - a.requests),
      daily: [...daily.values()],
    }
  }

  csv(h: AuthedHospital, from?: string, to?: string) {
    const range = this.range(from, to)
    const header = ['Request ID', 'Created (UTC)', 'Blood type', 'Component', 'Units', 'Urgency', 'Status', 'Patient ref', 'Donors notified', 'Replied', 'Can donate', 'Units collected']
    const lines = this.rows(h, range.start, range.end).map((r) =>
      [r.id, r.created_at, r.blood_type, r.component, r.units, r.urgency, r.status, r.patient_ref, r.notified, r.replied, r.can_donate, r.collected].map(csvCell).join(','),
    )
    // The byte order mark makes Excel read the file as UTF-8.
    return { filename: `nabd-requests-${range.from}-to-${range.to}.csv`, body: '﻿' + [header.join(','), ...lines].join('\r\n') + '\r\n' }
  }
}
