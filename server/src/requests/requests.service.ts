import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import type { AuthedHospital } from '../common/auth.decorators'
import type { Urgency } from '../common/blood'
import { maskPhone, shortName } from '../common/privacy'
import { DatabaseService } from '../database/database.service'
import { POSITIVE } from '../database/schema'
import { TemplatesService } from '../templates/templates.service'
import { WhatsappService } from '../whatsapp/whatsapp.service'
import type { CreateRequestDto, PreviewDto } from './requests.dto'
import { Match, MatchingService } from './matching.service'

interface RequestRow {
  id: number
  hospital_id: number
  blood_type: string
  include_compatible: number
  component: string
  units: number
  urgency: Urgency
  patient_ref: string | null
  note: string | null
  radius_km: number
  min_days: number
  status: 'open' | 'fulfilled' | 'expired'
  created_at: string
}

/** After this long an unfulfilled request stops collecting replies. */
const EXPIRES_AFTER_HOURS: Record<Urgency, number> = { urgent: 24, '24h': 48, week: 24 * 8 }
const pos = POSITIVE.map((s) => `'${s}'`).join(',')

@Injectable()
export class RequestsService {
  private readonly log = new Logger('Requests')

  constructor(
    private readonly db: DatabaseService,
    private readonly matching: MatchingService,
    private readonly wa: WhatsappService,
    private readonly templates: TemplatesService,
  ) {}

  private own(h: AuthedHospital, id: number): RequestRow {
    const r = this.db.get<RequestRow>('SELECT * FROM requests WHERE id = ? AND hospital_id = ?', id, h.id)
    if (!r) throw new NotFoundException('Request not found')
    return r
  }

  /** Closes open requests that ran past their time window. */
  expireOld(hospitalId: number) {
    for (const [urgency, hours] of Object.entries(EXPIRES_AFTER_HOURS)) {
      const cutoff = new Date(Date.now() - hours * 3_600_000).toISOString()
      this.db.run("UPDATE requests SET status = 'expired' WHERE hospital_id = ? AND status = 'open' AND urgency = ? AND created_at < ?", hospitalId, urgency, cutoff)
    }
  }

  list(h: AuthedHospital, status?: string) {
    this.expireOld(h.id)
    const rows = this.db.all<
      RequestRow & { notified: number; can_donate: number; arrived: number }
    >(
      `SELECT r.*,
         (SELECT COUNT(*) FROM request_donors WHERE request_id = r.id AND status != 'failed') AS notified,
         (SELECT COUNT(*) FROM request_donors WHERE request_id = r.id AND status IN (${pos})) AS can_donate,
         (SELECT COUNT(*) FROM request_donors WHERE request_id = r.id AND status = 'donated') AS arrived
       FROM requests r WHERE r.hospital_id = ? ${status ? 'AND r.status = ?' : ''}
       ORDER BY r.created_at DESC`,
      ...(status ? [h.id, status] : [h.id]),
    )
    const counts = Object.fromEntries(
      this.db.all<{ status: string; n: number }>('SELECT status, COUNT(*) AS n FROM requests WHERE hospital_id = ? GROUP BY status', h.id).map((c) => [c.status, c.n]),
    )
    return {
      counts: { open: counts.open ?? 0, fulfilled: counts.fulfilled ?? 0, expired: counts.expired ?? 0 },
      items: rows.map((r) => ({
        id: r.id,
        bloodType: r.blood_type,
        component: r.component,
        units: r.units,
        urgency: r.urgency,
        status: r.status,
        notified: r.notified,
        canDonate: r.can_donate,
        arrived: r.arrived,
        createdAt: r.created_at,
        hospital: h.name,
      })),
    }
  }

  /** Donors a request would reach, with contact details masked. */
  preview(h: AuthedHospital, dto: PreviewDto, limit = 50) {
    const matches = this.matching.find(h, dto)
    return {
      total: matches.length,
      defaultSelected: matches.filter((m) => m.selected).length,
      counts: {
        exact: matches.filter((m) => m.bloodType === dto.bloodType).length,
        compatible: matches.filter((m) => m.bloodType !== dto.bloodType).length,
        previouslyResponded: matches.filter((m) => m.yes > 0).length,
        within5km: matches.filter((m) => m.distanceKm <= 5).length,
      },
      donors: matches.slice(0, limit).map((m) => ({
        id: m.id,
        name: shortName(m.name),
        phone: maskPhone(m.phone),
        bloodType: m.bloodType,
        distanceKm: m.distanceKm,
        lastDonation: m.lastDonation,
        eligibleInDays: m.eligibleInDays,
        responses: { yes: m.yes, total: m.total },
        selected: m.selected,
      })),
    }
  }

  async create(h: AuthedHospital, dto: CreateRequestDto) {
    const matches = this.matching.find(h, dto)
    // The server decides who is eligible. The client can only narrow the list.
    const targets = dto.donorIds
      ? matches.filter((m) => dto.donorIds!.includes(m.id))
      : matches.filter((m) => m.selected && !dto.excludeDonorIds?.includes(m.id))
    if (targets.length === 0) throw new BadRequestException('No eligible donors to contact with these settings')

    const now = new Date().toISOString()
    const requestId = this.db.transaction(() => {
      const id = this.db.run(
        `INSERT INTO requests (hospital_id, blood_type, include_compatible, component, units, urgency, patient_ref, note, radius_km, min_days, status, created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?, 'open', ?)`,
        h.id, dto.bloodType, dto.includeCompatible ? 1 : 0, dto.component, dto.units, dto.urgency, dto.patientRef?.trim() || null, dto.note?.trim() || null, dto.radiusKm, dto.minDays, now,
      ).id
      for (const m of targets) {
        this.db.run('INSERT INTO request_donors (request_id, donor_id, distance_km, status, sent_at) VALUES (?,?,?,?,?)', id, m.id, m.distanceKm, 'sent', now)
      }
      return id
    })

    const r = await this.dispatch(h, this.own(h, requestId), targets)
    return { id: requestId, sent: r.sent, failed: r.failed }
  }

  /** Sends the request message to each target and records failures. */
  private async dispatch(h: AuthedHospital, req: RequestRow, targets: Match[]) {
    let sent = 0
    let failed = 0
    for (const m of targets) {
      const rd = this.db.get<{ id: number }>('SELECT id FROM request_donors WHERE request_id = ? AND donor_id = ?', req.id, m.id)!
      try {
        const res = await this.wa.sendRequest({
          to: m.phone,
          requestDonorId: rd.id,
          firstName: m.name.split(' ')[0],
          hospital: h.name,
          bloodType: req.blood_type,
          component: req.component,
          units: req.units,
          urgency: req.urgency,
          distanceKm: m.distanceKm,
          note: req.note ?? this.templates.render(h.id, 'default_note'),
        })
        this.db.run('UPDATE request_donors SET wa_message_id = ? WHERE id = ?', res.id, rd.id)
        sent++
      } catch (e) {
        this.db.run("UPDATE request_donors SET status = 'failed' WHERE id = ?", rd.id)
        this.log.error(`Send to donor ${m.id} failed: ${(e as Error).message}`)
        failed++
      }
    }
    this.db.run('INSERT INTO events (request_id, kind, text, flag, created_at) VALUES (?,?,?,?,?)', req.id, 'sent', `Broadcast sent to ${sent} donors via WhatsApp`, null, new Date().toISOString())
    return { sent, failed }
  }

  detail(h: AuthedHospital, id: number) {
    this.expireOld(h.id)
    const r = this.own(h, id)
    const rows = this.db.all<{
      id: number
      status: string
      eta: string | null
      sent_at: string
      replied_at: string | null
      reception_code: string | null
      name: string
      phone: string
      blood_type: string
    }>(
      `SELECT rd.id, rd.status, rd.eta, rd.sent_at, rd.replied_at, rd.reception_code, d.name, d.phone, d.blood_type
       FROM request_donors rd JOIN donors d ON d.id = rd.donor_id
       WHERE rd.request_id = ? AND rd.status != 'failed' ORDER BY rd.replied_at IS NULL, rd.replied_at`,
      id,
    )
    const count = (f: (s: string) => boolean) => rows.filter((x) => f(x.status)).length
    const canDonate = count((s) => (POSITIVE as readonly string[]).includes(s))
    const collected = count((s) => s === 'donated')
    const expandable = r.status === 'open' ? this.expandMatches(h, r).length : 0

    return {
      request: {
        id: r.id,
        bloodType: r.blood_type,
        includeCompatible: !!r.include_compatible,
        component: r.component,
        units: r.units,
        urgency: r.urgency,
        status: r.status,
        patientRef: r.patient_ref,
        note: r.note,
        radiusKm: r.radius_km,
        createdAt: r.created_at,
      },
      stats: {
        sent: rows.length,
        canDonate,
        declined: count((s) => s === 'declined' || s === 'paused'),
        pending: count((s) => s === 'sent'),
        collected,
        responseRate: rows.length ? Math.round((rows.filter((x) => x.status !== 'sent').length / rows.length) * 100) : 0,
      },
      // Only donors who said yes are listed, and only they get their full contact details revealed.
      responses: rows
        .filter((x) => (POSITIVE as readonly string[]).includes(x.status))
        .map((x) => ({
          id: x.id,
          name: x.name.split(' ')[0] + (x.name.split(' ').length > 1 ? ` ${x.name.split(' ').pop()![0]}.` : ''),
          fullName: x.name,
          phone: x.phone,
          bloodType: x.blood_type,
          status: x.status,
          eta: x.eta,
          receptionCode: x.reception_code,
          repliedAfterMin: x.replied_at ? Math.max(0, Math.round((new Date(x.replied_at).getTime() - new Date(x.sent_at).getTime()) / 60_000)) : null,
        })),
      activity: this.db
        .all<{ kind: string; text: string; flag: string | null; created_at: string }>('SELECT kind, text, flag, created_at FROM events WHERE request_id = ? ORDER BY created_at DESC, id DESC LIMIT 30', id)
        .map((e) => ({ kind: e.kind, text: e.text, flag: e.flag, at: e.created_at })),
      expandable,
    }
  }

  private expandMatches(h: AuthedHospital, r: RequestRow) {
    // Wider radius and a gap shortened by 7 days, skipping everyone already contacted.
    return this.matching
      .find(h, { bloodType: r.blood_type as never, includeCompatible: !!r.include_compatible, radiusKm: 30, minDays: Math.max(1, r.min_days - 7) }, r.id)
      .filter((m) => m.selected)
  }

  async expand(h: AuthedHospital, id: number) {
    const r = this.own(h, id)
    if (r.status !== 'open') throw new BadRequestException('Only open requests can be expanded')
    const targets = this.expandMatches(h, r)
    if (!targets.length) throw new BadRequestException('No more donors to contact')
    const now = new Date().toISOString()
    this.db.transaction(() => {
      for (const m of targets) this.db.run('INSERT INTO request_donors (request_id, donor_id, distance_km, status, sent_at) VALUES (?,?,?,?,?)', id, m.id, m.distanceKm, 'sent', now)
    })
    return this.dispatch(h, r, targets)
  }

  async remind(h: AuthedHospital, id: number) {
    const r = this.own(h, id)
    if (r.status !== 'open') throw new BadRequestException('Only open requests can send reminders')
    const pending = this.db.all<{ id: number; donor_id: number }>("SELECT id, donor_id FROM request_donors WHERE request_id = ? AND status = 'sent'", id)
    const matches = this.matching.find(h, { bloodType: r.blood_type as never, includeCompatible: true, radiusKm: 30, minDays: 0 })
    const byId = new Map(matches.map((m) => [m.id, m]))
    let n = 0
    for (const p of pending) {
      const m = byId.get(p.donor_id)
      if (!m) continue
      try {
        await this.wa.sendRequest({ to: m.phone, requestDonorId: p.id, firstName: m.name.split(' ')[0], hospital: h.name, bloodType: r.blood_type, component: r.component, units: r.units, urgency: r.urgency, distanceKm: m.distanceKm, note: r.note ?? this.templates.render(h.id, 'default_note') })
        n++
      } catch (e) {
        this.log.error(`Reminder to donor ${m.id} failed: ${(e as Error).message}`)
      }
    }
    this.db.run('INSERT INTO events (request_id, kind, text, flag, created_at) VALUES (?,?,?,?,?)', id, 'reminder', `Reminder sent to ${n} donors`, null, new Date().toISOString())
    return { reminded: n }
  }

  fulfill(h: AuthedHospital, id: number) {
    const r = this.own(h, id)
    if (r.status !== 'open') throw new BadRequestException('Request is already closed')
    this.db.run("UPDATE requests SET status = 'fulfilled' WHERE id = ?", id)
    this.db.run('INSERT INTO events (request_id, kind, text, flag, created_at) VALUES (?,?,?,?,?)', id, 'fulfilled', 'Request marked as fulfilled', null, new Date().toISOString())
    return { id, status: 'fulfilled' as const }
  }

  markArrived(h: AuthedHospital, id: number, responseId: number) {
    const r = this.own(h, id)
    if (r.status !== 'open') throw new BadRequestException('Request is closed')
    const rd = this.db.get<{ id: number; donor_id: number; status: string; name: string }>(
      'SELECT rd.id, rd.donor_id, rd.status, d.name FROM request_donors rd JOIN donors d ON d.id = rd.donor_id WHERE rd.id = ? AND rd.request_id = ?',
      responseId, id,
    )
    if (!rd) throw new NotFoundException('Response not found')
    if (!(POSITIVE as readonly string[]).includes(rd.status) || rd.status === 'donated') throw new BadRequestException('This donor has not confirmed or already donated')
    const today = new Date().toISOString().slice(0, 10)
    this.db.transaction(() => {
      this.db.run("UPDATE request_donors SET status = 'donated', eta = 'Arrived' WHERE id = ?", responseId)
      this.db.run('UPDATE donors SET last_donation = ?, donated_before = 1 WHERE id = ?', today, rd.donor_id)
      this.db.run('INSERT INTO events (request_id, kind, text, flag, created_at) VALUES (?,?,?,?,?)', id, 'donated', `${shortName(rd.name)} donated, 1 unit recorded`, null, new Date().toISOString())
    })
    return { id: responseId, status: 'donated' as const }
  }

  dashboard(h: AuthedHospital) {
    this.expireOld(h.id)
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const since = startOfDay.toISOString()
    const open = this.db.get<{ n: number; urgent: number }>(
      "SELECT COUNT(*) AS n, SUM(CASE WHEN urgency = 'urgent' THEN 1 ELSE 0 END) AS urgent FROM requests WHERE hospital_id = ? AND status = 'open'",
      h.id,
    )!
    const today = this.db.get<{ notified: number; confirmed: number }>(
      `SELECT COUNT(*) AS notified, SUM(CASE WHEN rd.status IN (${pos}) THEN 1 ELSE 0 END) AS confirmed
       FROM request_donors rd JOIN requests r ON r.id = rd.request_id
       WHERE r.hospital_id = ? AND rd.sent_at >= ? AND rd.status != 'failed'`,
      h.id, since,
    )!
    const week = this.db.all<{ sent_at: string; replied_at: string }>(
      `SELECT rd.sent_at, rd.replied_at FROM request_donors rd JOIN requests r ON r.id = rd.request_id
       WHERE r.hospital_id = ? AND rd.replied_at IS NOT NULL AND rd.sent_at >= ?`,
      h.id, new Date(Date.now() - 7 * 86_400_000).toISOString(),
    )
    const avg = week.length ? week.reduce((s, x) => s + (new Date(x.replied_at).getTime() - new Date(x.sent_at).getTime()), 0) / week.length / 60_000 : null
    return {
      openRequests: open.n,
      urgentOpen: open.urgent ?? 0,
      notifiedToday: today.notified,
      confirmedToday: today.confirmed ?? 0,
      responseRateToday: today.notified ? Math.round(((today.confirmed ?? 0) / today.notified) * 100) : 0,
      avgFirstReplyMin: avg == null ? null : Math.round(avg),
    }
  }
}
