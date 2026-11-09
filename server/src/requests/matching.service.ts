import { Injectable } from '@nestjs/common'
import { BLOOD_TYPES, BloodType, CAN_RECEIVE_FROM } from '../common/blood'
import { distanceKm } from '../common/geo'
import { DatabaseService } from '../database/database.service'
import { POSITIVE } from '../database/schema'

export interface MatchOptions {
  bloodType: BloodType
  includeCompatible: boolean
  radiusKm: number
  /** Minimum days since the last donation. */
  minDays: number
}

export interface Match {
  id: number
  name: string
  phone: string
  bloodType: BloodType
  city: string
  distanceKm: number
  lastDonation: string | null
  /** 0 when the donor may give today. */
  eligibleInDays: number
  yes: number
  total: number
  /** Whether the donor is ticked by default (eligible today). */
  selected: boolean
}

interface DonorRow {
  id: number
  name: string
  phone: string
  blood_type: BloodType
  city: string
  last_donation: string | null
  status: string
  paused_until: string | null
}

export const daysSince = (isoDate: string) => Math.floor((Date.now() - new Date(isoDate).getTime()) / 86_400_000)

/** Donors become eligible soon enough to be offered, but stay unticked. */
const SOON_DAYS = 14

@Injectable()
export class MatchingService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Finds donors for a request. Verified donors only, never opted out or paused, a compatible blood type,
   * inside the radius, and past (or close to) the minimum gap since the last donation.
   * `excludeRequestId` skips donors who were already contacted for that request.
   */
  find(hospital: { city: string }, opts: MatchOptions, excludeRequestId?: number): Match[] {
    const types = opts.includeCompatible ? CAN_RECEIVE_FROM[opts.bloodType] : [opts.bloodType]
    const known = types.filter((t) => (BLOOD_TYPES as readonly string[]).includes(t))
    const marks = known.map(() => '?').join(',')
    const rows = this.db.all<DonorRow>(
      `SELECT id, name, phone, blood_type, city, last_donation, status, paused_until
       FROM donors WHERE verified = 1 AND status != 'opted_out' AND blood_type IN (${marks})`,
      ...known,
    )

    const history = new Map<number, { yes: number; total: number }>()
    const positive = POSITIVE.map((s) => `'${s}'`).join(',')
    for (const h of this.db.all<{ donor_id: number; total: number; yes: number }>(
      `SELECT donor_id, COUNT(*) AS total, SUM(CASE WHEN status IN (${positive}) THEN 1 ELSE 0 END) AS yes
       FROM request_donors WHERE status != 'failed' GROUP BY donor_id`,
    )) {
      history.set(h.donor_id, { yes: h.yes, total: h.total })
    }

    const already = new Set<number>(
      excludeRequestId ? this.db.all<{ donor_id: number }>('SELECT donor_id FROM request_donors WHERE request_id = ?', excludeRequestId).map((r) => r.donor_id) : [],
    )

    const now = new Date().toISOString()
    const out: Match[] = []
    for (const d of rows) {
      if (already.has(d.id)) continue
      if (d.status === 'paused' && d.paused_until && d.paused_until > now) continue
      const dist = distanceKm(hospital.city, d.city, d.id)
      if (dist > opts.radiusKm) continue
      const eligibleInDays = d.last_donation ? Math.max(0, opts.minDays - daysSince(d.last_donation)) : 0
      if (eligibleInDays > SOON_DAYS) continue
      const h = history.get(d.id) ?? { yes: 0, total: 0 }
      out.push({
        id: d.id,
        name: d.name,
        phone: d.phone,
        bloodType: d.blood_type,
        city: d.city,
        distanceKm: dist,
        lastDonation: d.last_donation,
        eligibleInDays,
        yes: h.yes,
        total: h.total,
        selected: eligibleInDays === 0,
      })
    }
    return out.sort((a, b) => a.distanceKm - b.distanceKm || a.id - b.id)
  }
}
