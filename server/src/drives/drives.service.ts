import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import type { AuthedHospital } from '../common/auth.decorators'
import { BLOOD_TYPES } from '../common/blood'
import { distanceKm } from '../common/geo'
import { shortName } from '../common/privacy'
import { DatabaseService } from '../database/database.service'
import { driveDate } from '../whatsapp/replies.service'
import { WhatsappService } from '../whatsapp/whatsapp.service'
import type { CreateDriveDto, InviteDto, UpdateDriveDto } from './drives.dto'

interface DriveRow {
  id: number
  hospital_id: number
  title: string
  city: string
  location: string
  starts_at: string
  ends_at: string
  capacity: number | null
  notes: string | null
  status: 'scheduled' | 'cancelled'
  created_at: string
}

type Counts = { invited: number; going: number; declined: number }

const DAY = 86_400_000
/** Same gap as for whole blood requests, measured to the day of the drive. */
const MIN_DAYS = 56
const MAX_LENGTH_HOURS = 24

const toIso = (s: string) => new Date(s).toISOString()

@Injectable()
export class DrivesService {
  private readonly log = new Logger('Drives')

  constructor(
    private readonly db: DatabaseService,
    private readonly wa: WhatsappService,
  ) {}

  private own(h: AuthedHospital, id: number) {
    const d = this.db.get<DriveRow>('SELECT * FROM drives WHERE id = ? AND hospital_id = ?', id, h.id)
    if (!d) throw new NotFoundException('Blood drive not found')
    return d
  }

  private counts(driveId: number): Counts {
    return this.db.get<Counts>(
      `SELECT COUNT(*) AS invited,
         COALESCE(SUM(CASE WHEN status = 'going' THEN 1 ELSE 0 END), 0) AS going,
         COALESCE(SUM(CASE WHEN status = 'declined' THEN 1 ELSE 0 END), 0) AS declined
       FROM drive_invites WHERE drive_id = ? AND status != 'failed'`,
      driveId,
    )!
  }

  private view(d: DriveRow, c: Counts) {
    const now = new Date().toISOString()
    return {
      id: d.id,
      title: d.title,
      city: d.city,
      location: d.location,
      startsAt: d.starts_at,
      endsAt: d.ends_at,
      capacity: d.capacity,
      notes: d.notes,
      // "ended" is derived from the time, so it never needs a job to update it.
      status: d.status === 'cancelled' ? 'cancelled' : d.ends_at < now ? 'ended' : 'scheduled',
      createdAt: d.created_at,
      stats: { ...c, pending: c.invited - c.going - c.declined },
    }
  }

  private checkTimes(startsAt: string, endsAt: string, mustBeFuture: boolean) {
    if (endsAt <= startsAt) throw new BadRequestException('The drive must end after it starts')
    if (Date.parse(endsAt) - Date.parse(startsAt) > MAX_LENGTH_HOURS * 3_600_000) throw new BadRequestException(`A drive can last at most ${MAX_LENGTH_HOURS} hours`)
    if (mustBeFuture && startsAt < new Date().toISOString()) throw new BadRequestException('The drive must start in the future')
  }

  list(h: AuthedHospital, when: 'upcoming' | 'past' | 'all' = 'upcoming') {
    const now = new Date().toISOString()
    const filter = when === 'upcoming' ? 'AND ends_at >= ?' : when === 'past' ? 'AND ends_at < ?' : ''
    const rows = this.db.all<DriveRow>(
      `SELECT * FROM drives WHERE hospital_id = ? ${filter} ORDER BY starts_at ${when === 'past' ? 'DESC' : 'ASC'}`,
      ...(filter ? [h.id, now] : [h.id]),
    )
    return { items: rows.map((d) => this.view(d, this.counts(d.id))) }
  }

  create(h: AuthedHospital, dto: CreateDriveDto) {
    const startsAt = toIso(dto.startsAt)
    const endsAt = toIso(dto.endsAt)
    this.checkTimes(startsAt, endsAt, true)
    const { id } = this.db.run(
      'INSERT INTO drives (hospital_id, title, city, location, starts_at, ends_at, capacity, notes, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
      h.id, dto.title.trim(), dto.city, dto.location.trim(), startsAt, endsAt, dto.capacity ?? null, dto.notes?.trim() || null, 'scheduled', new Date().toISOString(),
    )
    return this.detail(h, id)
  }

  /** The drive with who said they will come. Names are shortened: a drive reply does not reveal contact details. */
  detail(h: AuthedHospital, id: number) {
    const d = this.own(h, id)
    const going = this.db.all<{ id: number; name: string; blood_type: string; replied_at: string }>(
      `SELECT i.id, dn.name, dn.blood_type, i.replied_at FROM drive_invites i JOIN donors dn ON dn.id = i.donor_id
       WHERE i.drive_id = ? AND i.status = 'going' ORDER BY i.replied_at`,
      id,
    )
    return {
      ...this.view(d, this.counts(id)),
      going: going.map((g) => ({ id: g.id, name: shortName(g.name), bloodType: g.blood_type, repliedAt: g.replied_at })),
    }
  }

  update(h: AuthedHospital, id: number, dto: UpdateDriveDto) {
    const d = this.own(h, id)
    if (d.status === 'cancelled') throw new BadRequestException('This drive was cancelled')
    if (d.ends_at < new Date().toISOString()) throw new BadRequestException('This drive has already ended')
    const startsAt = dto.startsAt ? toIso(dto.startsAt) : d.starts_at
    const endsAt = dto.endsAt ? toIso(dto.endsAt) : d.ends_at
    if (dto.startsAt || dto.endsAt) this.checkTimes(startsAt, endsAt, !!dto.startsAt)
    this.db.run(
      'UPDATE drives SET title = ?, city = ?, location = ?, starts_at = ?, ends_at = ?, capacity = ?, notes = ? WHERE id = ?',
      dto.title?.trim() ?? d.title,
      dto.city ?? d.city,
      dto.location?.trim() ?? d.location,
      startsAt,
      endsAt,
      dto.capacity !== undefined ? dto.capacity : d.capacity,
      dto.notes !== undefined ? dto.notes.trim() || null : d.notes,
      id,
    )
    return this.detail(h, id)
  }

  /** Cancels instead of deleting, so invites already sent keep pointing at a real drive. */
  cancel(h: AuthedHospital, id: number) {
    const d = this.own(h, id)
    if (d.status === 'cancelled') throw new BadRequestException('This drive is already cancelled')
    this.db.run("UPDATE drives SET status = 'cancelled' WHERE id = ?", id)
    return this.detail(h, id)
  }

  /** Verified, active donors near the drive who will be past the minimum gap on the day, and not invited yet. */
  private candidates(d: DriveRow, dto: InviteDto) {
    const types = dto.bloodTypes?.length ? dto.bloodTypes : [...BLOOD_TYPES, 'unknown']
    const rows = this.db.all<{ id: number; name: string; phone: string; city: string; last_donation: string | null; status: string; paused_until: string | null }>(
      `SELECT id, name, phone, city, last_donation, status, paused_until FROM donors
       WHERE verified = 1 AND status != 'opted_out' AND blood_type IN (${types.map(() => '?').join(',')})
         AND id NOT IN (SELECT donor_id FROM drive_invites WHERE drive_id = ?)`,
      ...types, d.id,
    )
    const now = new Date().toISOString()
    const start = Date.parse(d.starts_at)
    return rows
      .filter((r) => !(r.status === 'paused' && r.paused_until && r.paused_until > now))
      .filter((r) => !r.last_donation || (start - Date.parse(r.last_donation)) / DAY >= MIN_DAYS)
      .map((r) => ({ ...r, distanceKm: distanceKm(d.city, r.city, r.id) }))
      .filter((r) => r.distanceKm <= dto.radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm || a.id - b.id)
  }

  async invite(h: AuthedHospital, id: number, dto: InviteDto) {
    const d = this.own(h, id)
    if (d.status === 'cancelled') throw new BadRequestException('This drive was cancelled')
    if (d.ends_at < new Date().toISOString()) throw new BadRequestException('This drive has already ended')
    const targets = this.candidates(d, dto)
    if (dto.dryRun) return { wouldInvite: targets.length }
    if (!targets.length) throw new BadRequestException('No more donors to invite with these settings')

    const now = new Date().toISOString()
    const ids = this.db.transaction(() =>
      targets.map((t) => this.db.run('INSERT INTO drive_invites (drive_id, donor_id, distance_km, status, sent_at) VALUES (?,?,?,?,?)', id, t.id, t.distanceKm, 'sent', now).id),
    )
    let invited = 0
    let failed = 0
    const date = driveDate(d.starts_at)
    for (const [i, t] of targets.entries()) {
      try {
        await this.wa.sendDriveInvite({ to: t.phone, inviteId: ids[i], firstName: t.name.split(' ')[0], hospital: h.name, title: d.title, date, location: d.location })
        invited++
      } catch (e) {
        this.db.run("UPDATE drive_invites SET status = 'failed' WHERE id = ?", ids[i])
        this.log.error(`Drive invite to donor ${t.id} failed: ${(e as Error).message}`)
        failed++
      }
    }
    return { invited, failed }
  }
}
