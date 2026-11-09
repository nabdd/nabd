import { Injectable, Logger } from '@nestjs/common'
import { shortName } from '../common/privacy'
import { DatabaseService } from '../database/database.service'
import { TemplatesService } from '../templates/templates.service'
import { WhatsappService } from './whatsapp.service'

interface Row {
  id: number
  request_id: number
  status: string
  reception_code: string | null
  donor_id: number
  name: string
  phone: string
  req_status: string
  hospital_id: number
  hospital: string
}

/** Drive dates in messages are shown in Lebanese time. */
export const driveDate = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { timeZone: 'Asia/Beirut', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

const ETA: Record<string, { status: 'enroute' | 'confirmed' | 'later'; label: string }> = {
  eta_1h: { status: 'enroute', label: 'Within 1 hour' },
  eta_today: { status: 'confirmed', label: 'Later today' },
  eta_tomorrow: { status: 'later', label: 'Tomorrow' },
}

@Injectable()
export class RepliesService {
  private readonly log = new Logger('Replies')

  constructor(
    private readonly db: DatabaseService,
    private readonly wa: WhatsappService,
    private readonly templates: TemplatesService,
  ) {}

  private load(requestDonorId: number) {
    return this.db.get<Row>(
      `SELECT rd.id, rd.request_id, rd.status, rd.reception_code, d.id AS donor_id, d.name, d.phone,
              r.status AS req_status, h.id AS hospital_id, h.name AS hospital
       FROM request_donors rd
       JOIN donors d ON d.id = rd.donor_id
       JOIN requests r ON r.id = rd.request_id
       JOIN hospitals h ON h.id = r.hospital_id
       WHERE rd.id = ?`,
      requestDonorId,
    )
  }

  private event(requestId: number, kind: string, text: string, flag: string | null = null) {
    this.db.run('INSERT INTO events (request_id, kind, text, flag, created_at) VALUES (?,?,?,?,?)', requestId, kind, text, flag, new Date().toISOString())
  }

  /** A tapped button. `payload` looks like "yes:42". `from` (E.164) must match the donor when given. */
  async handleButton(payload: string, from?: string) {
    const [action, idRaw] = payload.split(':')
    const id = Number(idRaw)
    if (!Number.isInteger(id)) return this.log.warn(`Ignoring malformed payload "${payload.slice(0, 30)}"`)
    if (action === 'drive_yes' || action === 'drive_no') return this.handleDrive(action, id, from)
    const rd = this.load(id)
    if (!rd) return this.log.warn(`Reply for unknown request_donor ${id}`)
    if (from && from !== rd.phone) return this.log.warn(`Reply for request_donor ${id} came from a different number, ignored`)

    const firstName = rd.name.split(' ')[0]
    const text = (key: Parameters<TemplatesService['render']>[1], vars: Record<string, string> = {}) =>
      this.templates.render(rd.hospital_id, key, { firstName, hospital: rd.hospital, ...vars })

    if (rd.req_status !== 'open') {
      await this.wa.provider.sendText(rd.phone, text('closed'))
      return
    }

    const now = new Date().toISOString()
    const who = shortName(rd.name)

    if (action === 'yes') {
      const code = rd.reception_code ?? `NB-${1000 + ((rd.id * 7919) % 9000)}`
      this.db.run("UPDATE request_donors SET status = 'confirmed', replied_at = COALESCE(replied_at, ?), reception_code = ? WHERE id = ?", now, code, id)
      this.event(rd.request_id, 'confirmed', `${who} can donate`)
      await this.wa.provider.sendButtons(rd.phone, text('ask_eta'), [
        { id: `eta_1h:${id}`, label: 'Within 1 hour' },
        { id: `eta_today:${id}`, label: 'Later today' },
        { id: `eta_tomorrow:${id}`, label: 'Tomorrow' },
      ])
    } else if (action === 'no') {
      this.db.run("UPDATE request_donors SET status = 'declined', replied_at = COALESCE(replied_at, ?) WHERE id = ?", now, id)
      this.event(rd.request_id, 'declined', `${who} replied "Not this time"`)
      await this.wa.provider.sendText(rd.phone, text('declined'))
    } else if (action === 'pause') {
      const until = new Date(Date.now() + 30 * 86_400_000).toISOString()
      this.db.transaction(() => {
        this.db.run("UPDATE request_donors SET status = 'paused', replied_at = COALESCE(replied_at, ?) WHERE id = ?", now, id)
        this.db.run("UPDATE donors SET status = 'paused', paused_until = ? WHERE id = ?", until, rd.donor_id)
      })
      this.event(rd.request_id, 'declined', `${who} paused alerts for 30 days`)
      await this.wa.provider.sendText(rd.phone, text('paused'))
    } else if (ETA[action]) {
      if (!['confirmed', 'enroute', 'later'].includes(rd.status)) return
      const e = ETA[action]
      this.db.run('UPDATE request_donors SET status = ?, eta = ? WHERE id = ?', e.status, e.label, id)
      this.event(rd.request_id, e.status, `${who} is coming: ${e.label.toLowerCase()}`)
      await this.wa.provider.sendText(rd.phone, text('eta_confirmed', { code: rd.reception_code ?? '' }))
    } else {
      this.log.warn(`Unknown action "${action}"`)
    }
  }

  /** "I will come" or "Not this time" on a blood drive invite. */
  private async handleDrive(action: 'drive_yes' | 'drive_no', inviteId: number, from?: string) {
    const inv = this.db.get<{
      id: number
      drive_id: number
      status: string
      name: string
      phone: string
      hospital_id: number
      title: string
      location: string
      starts_at: string
      ends_at: string
      capacity: number | null
      drive_status: string
    }>(
      `SELECT i.id, i.drive_id, i.status, d.name, d.phone, v.hospital_id, v.title, v.location, v.starts_at, v.ends_at, v.capacity, v.status AS drive_status
       FROM drive_invites i JOIN donors d ON d.id = i.donor_id JOIN drives v ON v.id = i.drive_id
       WHERE i.id = ?`,
      inviteId,
    )
    if (!inv) return this.log.warn(`Reply for unknown drive invite ${inviteId}`)
    if (from && from !== inv.phone) return this.log.warn(`Reply for drive invite ${inviteId} came from a different number, ignored`)
    if (inv.drive_status !== 'scheduled' || inv.ends_at < new Date().toISOString()) {
      await this.wa.provider.sendText(inv.phone, 'This blood drive has ended or was cancelled. Thank you for answering.')
      return
    }
    const firstName = inv.name.split(' ')[0]
    const now = new Date().toISOString()
    if (action === 'drive_no') {
      this.db.run("UPDATE drive_invites SET status = 'declined', replied_at = COALESCE(replied_at, ?) WHERE id = ?", now, inv.id)
      await this.wa.provider.sendText(inv.phone, this.templates.render(inv.hospital_id, 'drive_declined', { firstName }))
      return
    }
    if (inv.status !== 'going' && inv.capacity != null) {
      const going = this.db.get<{ n: number }>("SELECT COUNT(*) AS n FROM drive_invites WHERE drive_id = ? AND status = 'going'", inv.drive_id)!.n
      if (going >= inv.capacity) {
        await this.wa.provider.sendText(inv.phone, 'Thank you! This drive is already full. We will message you about the next one.')
        return
      }
    }
    this.db.run("UPDATE drive_invites SET status = 'going', replied_at = COALESCE(replied_at, ?) WHERE id = ?", now, inv.id)
    await this.wa.provider.sendText(
      inv.phone,
      this.templates.render(inv.hospital_id, 'drive_going', { firstName, title: inv.title, location: inv.location, date: driveDate(inv.starts_at) }),
    )
  }

  /** A free-text message from a donor. */
  async handleText(from: string, body: string) {
    const donor = this.db.get<{ id: number; name: string; phone: string }>('SELECT id, name, phone FROM donors WHERE phone = ?', from)
    if (!donor) return
    const text = body.trim()
    const word = text.toUpperCase()

    if (word === 'STOP') {
      this.db.run("UPDATE donors SET status = 'opted_out' WHERE id = ?", donor.id)
      await this.wa.provider.sendText(donor.phone, 'You are removed from Nabd. You will not get more messages.')
    } else if (word === 'YES') {
      this.db.run('UPDATE donors SET verified = 1 WHERE id = ?', donor.id)
      await this.wa.provider.sendText(donor.phone, 'Thank you, your number is verified. We will message you only when your blood type is needed nearby.')
    } else if (text) {
      // Anything else is a question for the hospital (for example "Which entrance?").
      const rd = this.db.get<{ request_id: number }>(
        `SELECT rd.request_id FROM request_donors rd JOIN requests r ON r.id = rd.request_id
         WHERE rd.donor_id = ? AND r.status = 'open' AND rd.status IN ('confirmed','enroute','later')
         ORDER BY rd.sent_at DESC LIMIT 1`,
        donor.id,
      )
      if (rd) this.event(rd.request_id, 'question', `${shortName(donor.name)} asked "${text.slice(0, 140)}"`, 'Needs reply')
    }
  }
}
