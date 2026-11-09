import { hashSync } from 'bcryptjs'
import { CITY_NAMES } from '../common/geo'
import type { DatabaseService } from './database.service'

const DAY = 86_400_000
const ago = (days: number, hours = 0) => new Date(Date.now() - days * DAY - hours * 3_600_000).toISOString()
const dateOnly = (days: number) => ago(days).slice(0, 10)

export const DEMO_EMAIL = 'bloodbank@aubmc.org.lb'
export const DEMO_PASSWORD = 'nabd-demo-2026'

const FIRST = ['Rami', 'Nour', 'Jad', 'Maya', 'Karim', 'Lara', 'Omar', 'Sara', 'Youssef', 'Tala', 'Georges', 'Dana', 'Elie', 'Hiba', 'Hadi', 'Rita', 'Charbel', 'Yara', 'Fadi', 'Layal', 'Sami', 'Joumana', 'Antoine', 'Zeina']
const LAST = ['Haddad', 'Khalil', 'Azar', 'Saad', 'Fakhoury', 'Tannous', 'Bitar', 'Ghanem', 'Aoun', 'Mansour', 'Nasr', 'Karam', 'Rahme', 'Sleiman', 'Daher', 'Mikhael']
// Blood type spread roughly follows the real distribution: O+ and A+ most common.
const TYPE_POOL = ['O+', 'O+', 'O+', 'O+', 'A+', 'A+', 'A+', 'B+', 'B+', 'O-', 'O-', 'A-', 'AB+', 'B-', 'AB-'] as const

/** Demo data for development. Never runs in production unless SEED_DEMO=true is set on purpose. */
export function seedDemo(db: DatabaseService) {
  const hospital = db.run('INSERT INTO hospitals (name, email, password_hash, city, created_at) VALUES (?,?,?,?,?)', 'AUBMC Blood Bank', DEMO_EMAIL, hashSync(DEMO_PASSWORD, 10), 'Beirut', ago(90))
  const hid = hospital.id

  db.transaction(() => {
    for (let i = 0; i < 200; i++) {
      const name = `${FIRST[i % FIRST.length]} ${LAST[(i * 5 + 3) % LAST.length]}`
      const type = TYPE_POOL[(i * 7) % TYPE_POOL.length]
      const nearby = ['Beirut', 'Beirut', 'Beirut', 'Baabda', 'Jounieh']
      const city = i % 4 === 3 ? CITY_NAMES[(i * 3) % CITY_NAMES.length] : nearby[i % nearby.length]
      const last = i % 4 === 0 ? null : dateOnly(30 + ((i * 17) % 200))
      db.run(
        `INSERT INTO donors (name, phone, age, blood_type, city, smoker, donated_before, last_donation, status, paused_until, verified, consent_at, created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,1,?,?)`,
        name,
        `+9617${String(1000000 + i * 7919).slice(0, 7)}`,
        20 + (i % 35),
        type,
        city,
        i % 5 === 0 ? 1 : 0,
        last ? 1 : 0,
        last,
        i === 11 ? 'paused' : i === 29 ? 'opted_out' : 'active',
        i === 11 ? ago(-20) : null,
        ago(120),
        ago(120),
      )
    }
  })

  // Three open requests with replies in varied states, one fulfilled, one expired.
  const req = (type: string, comp: string, units: number, urgency: string, status: string, createdHoursAgo: number, note: string | null) =>
    db.run(
      `INSERT INTO requests (hospital_id, blood_type, include_compatible, component, units, urgency, patient_ref, note, radius_km, min_days, status, created_at)
       VALUES (?,?,1,?,?,?,?,?,20,56,?,?)`,
      hid, type, comp, units, urgency, `ER-${2200 + Math.floor(createdHoursAgo)}`, note, status, ago(0, createdHoursAgo),
    ).id

  const r1 = req('O-', 'Whole blood', 3, 'urgent', 'open', 0.15, 'Emergency surgery. Blood Bank, Ground floor, Building C. Bring your ID.')
  const r2 = req('A+', 'Platelets', 2, '24h', 'open', 0.5, null)
  const r3 = req('AB-', 'Plasma', 1, 'urgent', 'open', 2, null)
  const r4 = req('B+', 'Whole blood', 1, 'week', 'fulfilled', 26, null)
  const r5 = req('A-', 'Platelets', 1, 'week', 'expired', 150, null)

  const donorIds = db.all<{ id: number; blood_type: string }>('SELECT id, blood_type FROM donors WHERE status = ? ORDER BY id', 'active')
  const pick = (types: string[], n: number) => donorIds.filter((d) => types.includes(d.blood_type)).slice(0, n)
  const link = (rid: number, d: { id: number }, status: string, sentHoursAgo: number, replyMin: number | null, eta: string | null) => {
    const sent = ago(0, sentHoursAgo)
    db.run(
      `INSERT OR IGNORE INTO request_donors (request_id, donor_id, distance_km, status, eta, sent_at, replied_at, wa_message_id, reception_code)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      rid, d.id, 1 + (d.id % 17), status, eta, sent,
      replyMin == null ? null : new Date(new Date(sent).getTime() + replyMin * 60_000).toISOString(),
      `seed-${rid}-${d.id}`, status === 'sent' || status === 'declined' ? null : `NB-${4400 + d.id}`,
    )
  }

  const first = pick(['O-', 'O+'], 27)
  const states: [string, number | null, string | null][] = [
    ['donated', 3, 'Arrived'], ['enroute', 5, 'On the way, about 15 min'], ['confirmed', 8, 'Coming at 13:00'], ['confirmed', 11, 'Coming at 14:30'],
    ['later', 14, 'Tomorrow 09:00'], ['confirmed', 19, 'Asked for directions'],
  ]
  first.forEach((d, i) => {
    if (i < states.length) link(r1, d, states[i][0], 0.15, states[i][1], states[i][2])
    else if (i < states.length + 9) link(r1, d, 'declined', 0.15, 20 + i, null)
    else link(r1, d, 'sent', 0.15, null, null)
  })
  pick(['A+', 'A-', 'O+', 'O-'], 41).forEach((d, i) => link(r2, d, i < 12 ? 'confirmed' : 'sent', 0.5, i < 12 ? 6 + i : null, i < 12 ? 'Later today' : null))
  pick(['AB-', 'A-', 'B-', 'O-'], 30).forEach((d, i) => link(r3, d, i === 0 ? 'confirmed' : 'sent', 2, i === 0 ? 30 : null, i === 0 ? 'Later today' : null))
  pick(['B+', 'B-', 'O+', 'O-'], 18).forEach((d, i) => link(r4, d, i === 0 ? 'donated' : i < 5 ? 'confirmed' : 'declined', 26, 12, i === 0 ? 'Arrived' : null))
  pick(['A-', 'O-'], 12).forEach((d) => link(r5, d, 'declined', 150, 30, null))

  const ev = (rid: number, kind: string, text: string, hoursAgo: number, flag: string | null = null) =>
    db.run('INSERT INTO events (request_id, kind, text, flag, created_at) VALUES (?,?,?,?,?)', rid, kind, text, flag, ago(0, hoursAgo))
  ev(r1, 'sent', 'Broadcast sent to 27 donors via WhatsApp', 0.15)
  ev(r1, 'declined', '9 donors replied "Not this time"', 0.1)
  ev(r1, 'question', 'A donor asked "Which entrance?"', 0.05, 'Needs reply')
  ev(r1, 'enroute', 'A donor replied "On my way"', 0.04)
  ev(r1, 'donated', 'A donor donated, 1 unit recorded', 0.02)
  ev(r2, 'sent', 'Broadcast sent to 41 donors via WhatsApp', 0.5)
  ev(r3, 'sent', 'Broadcast sent to 30 donors via WhatsApp', 2)

  const start = new Date(Date.now() + 10 * DAY)
  start.setUTCHours(7, 0, 0, 0)
  db.run(
    'INSERT INTO drives (hospital_id, title, city, location, starts_at, ends_at, capacity, notes, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
    hid, 'Winter blood drive', 'Beirut', 'AUBMC main lobby, Building C', start.toISOString(), new Date(start.getTime() + 8 * 3_600_000).toISOString(), 80, 'Free parking for donors.', 'scheduled', ago(2),
  )
}
