import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import type { AuthedHospital } from '../common/auth.decorators'
import { BLOOD_TYPES } from '../common/blood'
import { maskPhone, normalizeLebanesePhone, shortName } from '../common/privacy'
import { DatabaseService } from '../database/database.service'
import { POSITIVE, REVEALED } from '../database/schema'
import { daysSince } from '../requests/matching.service'
import { WhatsappService } from '../whatsapp/whatsapp.service'
import type { JoinDto, ListDonorsQuery, UpdateDonorDto } from './donors.dto'

interface DonorRow {
  id: number
  name: string
  phone: string
  blood_type: string
  city: string
  last_donation: string | null
  status: string
  paused_until: string | null
  verified: number
  yes: number
  total: number
}

const MIN_DAYS = 56

const eligibleInDays = (lastDonation: string | null) => (lastDonation ? Math.max(0, MIN_DAYS - daysSince(lastDonation)) : 0)

/** A pause that has run out counts as active again. */
const effectiveStatus = (d: { status: string; paused_until: string | null }) =>
  d.status === 'opted_out' ? 'opted_out' : d.status === 'paused' && d.paused_until && d.paused_until > new Date().toISOString() ? 'paused' : 'active'

interface FullDonorRow {
  id: number
  name: string
  phone: string
  age: number
  blood_type: string
  city: string
  smoker: number
  donated_before: number
  last_donation: string | null
  status: string
  paused_until: string | null
  created_at: string
}

@Injectable()
export class DonorsService {
  private readonly log = new Logger('Donors')

  constructor(
    private readonly db: DatabaseService,
    private readonly wa: WhatsappService,
  ) {}

  /**
   * Public sign-up. The response is the same whether or not the number was already registered,
   * so the form cannot be used to find out who is on the list.
   */
  async join(dto: JoinDto) {
    const phone = normalizeLebanesePhone(dto.phone)
    if (!phone) throw new BadRequestException('Enter a valid Lebanese WhatsApp number')
    const now = new Date().toISOString()
    const exists = this.db.get('SELECT id FROM donors WHERE phone = ?', phone)
    if (!exists) {
      this.db.run(
        `INSERT INTO donors (name, phone, age, blood_type, city, smoker, donated_before, status, verified, consent_at, created_at)
         VALUES (?,?,?,?,?,?,?, 'active', 0, ?, ?)`,
        dto.name.trim(), phone, dto.age, dto.bloodType, dto.city, dto.smoker ? 1 : 0, dto.donatedBefore ? 1 : 0, now, now,
      )
      try {
        await this.wa.sendVerification(phone, dto.name.trim().split(' ')[0])
      } catch (e) {
        // The donor is saved; they can verify later by replying YES to any message.
        this.log.error(`Verification message failed: ${(e as Error).message}`)
      }
    }
    return { ok: true, firstName: dto.name.trim().split(' ')[0] }
  }

  list(h: AuthedHospital, q: ListDonorsQuery) {
    const page = q.page ?? 1
    const pageSize = q.pageSize ?? 20
    const rows = this.db.all<DonorRow>(
      `SELECT d.id, d.name, d.phone, d.blood_type, d.city, d.last_donation, d.status, d.paused_until, d.verified,
         COALESCE(SUM(CASE WHEN rd.status IN ('confirmed','enroute','donated','later') THEN 1 ELSE 0 END), 0) AS yes,
         COUNT(rd.id) AS total
       FROM donors d LEFT JOIN request_donors rd ON rd.donor_id = d.id AND rd.status != 'failed'
       WHERE d.verified = 1 ${q.type ? 'AND d.blood_type = ?' : ''}
       GROUP BY d.id ORDER BY d.name`,
      ...(q.type ? [q.type] : []),
    )

    const revealed = this.revealedTo(h.id)
    const needle = q.q?.trim().toLowerCase()
    const items = rows
      .map((d) => {
        const see = revealed.has(d.id)
        return {
          id: d.id,
          name: see ? d.name : shortName(d.name),
          phone: see ? d.phone : maskPhone(d.phone),
          contactRevealed: see,
          bloodType: d.blood_type,
          city: d.city,
          lastDonation: d.last_donation,
          eligibleInDays: eligibleInDays(d.last_donation),
          responseRate: d.total ? { yes: d.yes, total: d.total } : null,
          status: effectiveStatus(d),
        }
      })
      .filter((d) => (q.eligible === 'now' ? d.eligibleInDays === 0 && d.status === 'active' : true))
      .filter((d) => !needle || d.name.toLowerCase().includes(needle) || (d.contactRevealed && d.phone.includes(needle)))

    return { total: items.length, page, pageSize, items: items.slice((page - 1) * pageSize, page * pageSize) }
  }

  /** A hospital sees full contact details only for donors who said yes to one of its own requests. */
  private revealedTo(hospitalId: number, donorId?: number) {
    return new Set(
      this.db
        .all<{ donor_id: number }>(
          `SELECT DISTINCT rd.donor_id FROM request_donors rd JOIN requests r ON r.id = rd.request_id
           WHERE r.hospital_id = ? AND rd.status IN (${REVEALED.map((s) => `'${s}'`).join(',')}) ${donorId ? 'AND rd.donor_id = ?' : ''}`,
          ...(donorId ? [hospitalId, donorId] : [hospitalId]),
        )
        .map((r) => r.donor_id),
    )
  }

  /** Donor profile. Personal details stay hidden until the donor confirmed one of this hospital's requests. */
  detail(h: AuthedHospital, id: number) {
    const d = this.db.get<FullDonorRow>('SELECT * FROM donors WHERE id = ? AND verified = 1', id)
    if (!d) throw new NotFoundException('Donor not found')
    const see = this.revealedTo(h.id, id).has(id)
    const totals = this.db.get<{ total: number; yes: number; donated: number }>(
      `SELECT COUNT(*) AS total,
         COALESCE(SUM(CASE WHEN status IN (${POSITIVE.map((s) => `'${s}'`).join(',')}) THEN 1 ELSE 0 END), 0) AS yes,
         COALESCE(SUM(CASE WHEN status = 'donated' THEN 1 ELSE 0 END), 0) AS donated
       FROM request_donors WHERE donor_id = ? AND status != 'failed'`,
      id,
    )!
    // Only this hospital's own requests: other hospitals' activity is not shared.
    const history = this.db.all<{ id: number; status: string; eta: string | null; sent_at: string; replied_at: string | null; request_id: number; blood_type: string; component: string; urgency: string }>(
      `SELECT rd.id, rd.status, rd.eta, rd.sent_at, rd.replied_at, r.id AS request_id, r.blood_type, r.component, r.urgency
       FROM request_donors rd JOIN requests r ON r.id = rd.request_id
       WHERE rd.donor_id = ? AND r.hospital_id = ? AND rd.status != 'failed'
       ORDER BY rd.sent_at DESC LIMIT 50`,
      id, h.id,
    )
    return {
      id: d.id,
      name: see ? d.name : shortName(d.name),
      phone: see ? d.phone : maskPhone(d.phone),
      contactRevealed: see,
      bloodType: d.blood_type,
      city: d.city,
      // Health details are for the blood bank that will see the donor in person.
      details: see ? { age: d.age, smoker: !!d.smoker, donatedBefore: !!d.donated_before } : null,
      lastDonation: d.last_donation,
      eligibleInDays: eligibleInDays(d.last_donation),
      status: effectiveStatus(d),
      pausedUntil: effectiveStatus(d) === 'paused' ? d.paused_until : null,
      joinedAt: d.created_at,
      responses: { total: totals.total, yes: totals.yes, donated: totals.donated },
      history: history.map((x) => ({
        id: x.id,
        requestId: x.request_id,
        bloodType: x.blood_type,
        component: x.component,
        urgency: x.urgency,
        status: x.status,
        eta: x.eta,
        sentAt: x.sent_at,
        repliedAt: x.replied_at,
      })),
    }
  }

  /** Lets the blood bank that saw the donor record their typed blood group or an outside donation. */
  update(h: AuthedHospital, id: number, dto: UpdateDonorDto) {
    if (dto.bloodType === undefined && dto.lastDonation === undefined) throw new BadRequestException('Nothing to update')
    if (!this.db.get('SELECT id FROM donors WHERE id = ? AND verified = 1', id)) throw new NotFoundException('Donor not found')
    if (!this.revealedTo(h.id, id).has(id)) throw new ForbiddenException('You can update a donor only after they confirmed one of your requests')
    if (dto.lastDonation !== undefined) {
      const t = new Date(`${dto.lastDonation}T00:00:00Z`)
      if (Number.isNaN(t.getTime()) || t.toISOString().slice(0, 10) !== dto.lastDonation) throw new BadRequestException('lastDonation is not a real date')
      if (dto.lastDonation > new Date().toISOString().slice(0, 10)) throw new BadRequestException('lastDonation cannot be in the future')
      if (dto.lastDonation < '1950-01-01') throw new BadRequestException('lastDonation is too far in the past')
    }
    this.db.run(
      'UPDATE donors SET blood_type = COALESCE(?, blood_type), last_donation = COALESCE(?, last_donation), donated_before = CASE WHEN ? IS NULL THEN donated_before ELSE 1 END WHERE id = ?',
      dto.bloodType ?? null, dto.lastDonation ?? null, dto.lastDonation ?? null, id,
    )
    return this.detail(h, id)
  }

  stats() {
    const byType = Object.fromEntries(BLOOD_TYPES.map((t) => [t, 0])) as Record<string, number>
    for (const r of this.db.all<{ blood_type: string; n: number }>("SELECT blood_type, COUNT(*) AS n FROM donors WHERE verified = 1 AND status != 'opted_out' GROUP BY blood_type")) {
      if (r.blood_type in byType) byType[r.blood_type] = r.n
    }
    const total = this.db.get<{ n: number }>("SELECT COUNT(*) AS n FROM donors WHERE verified = 1 AND status != 'opted_out'")!.n
    const available = this.db.get<{ n: number }>("SELECT COUNT(*) AS n FROM donors WHERE verified = 1 AND status = 'active'")!.n
    return { total, available, byType }
  }
}
