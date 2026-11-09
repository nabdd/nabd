import './setup-env'
import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import type { INestApplication } from '@nestjs/common'
import { createApp } from '../src/main'

let app: INestApplication
let base = ''
let token = ''

const call = async (method: string, path: string, body?: unknown, opts: { token?: string | null; headers?: Record<string, string> } = {}) => {
  const t = opts.token === undefined ? token : opts.token
  const res = await fetch(`${base}/api${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
      ...opts.headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json: any
  try {
    json = JSON.parse(text)
  } catch {
    json = text
  }
  return { status: res.status, json, headers: res.headers }
}

const admin = { 'x-admin-token': 'test-admin-token-123' }
const outbox = async () => (await call('GET', '/dev/outbox', undefined, { token: null })).json.messages as any[]
const inDays = (d: number, h = 9) => {
  const t = new Date(Date.now() + d * 86_400_000)
  t.setUTCHours(h, 0, 0, 0)
  return t.toISOString()
}
const requestBody = { bloodType: 'O-', includeCompatible: true, component: 'Whole blood', units: 1, urgency: 'urgent', radiusKm: 20, minDays: 56 }

/** Donors of the demo hospital, split by whether their contact is revealed to it. */
async function donorsByReveal() {
  const all: any[] = []
  for (let page = 1; page <= 3; page++) all.push(...(await call('GET', `/donors?pageSize=100&page=${page}`)).json.items)
  return { revealed: all.filter((d) => d.contactRevealed), masked: all.filter((d) => !d.contactRevealed) }
}

before(async () => {
  app = await createApp()
  await app.listen(0)
  base = `http://127.0.0.1:${(app.getHttpServer().address() as { port: number }).port}`
  token = (await call('POST', '/auth/login', { email: 'bloodbank@aubmc.org.lb', password: 'nabd-demo-2026' }, { token: null })).json.token
})
after(async () => {
  await app.close()
})

describe('health', () => {
  it('answers without a sign-in', async () => {
    const r = await call('GET', '/health', undefined, { token: null })
    assert.equal(r.status, 200)
    assert.equal(r.json.status, 'ok')
  })
})

describe('admin and passwords', () => {
  let otherToken = ''
  const hospital = { name: 'Rafik Hariri Hospital', email: 'Bank@RHUH.example', password: 'first-password-1', city: 'Beirut' }

  it('requires the admin token', async () => {
    assert.equal((await call('GET', '/admin/hospitals', undefined, { token: null })).status, 401)
    assert.equal((await call('GET', '/admin/hospitals', undefined, { token: null, headers: { 'x-admin-token': 'wrong' } })).status, 401)
    assert.equal((await call('GET', '/admin/hospitals', undefined, { headers: {} })).status, 401, 'a hospital token is not an admin token')
  })

  it('creates a hospital that can sign in, and refuses duplicates', async () => {
    assert.equal((await call('POST', '/admin/hospitals', { ...hospital, password: 'short' }, { token: null, headers: admin })).status, 400)
    const r = await call('POST', '/admin/hospitals', hospital, { token: null, headers: admin })
    assert.equal(r.status, 201)
    assert.equal(r.json.hospital.email, 'bank@rhuh.example')
    assert.equal(r.json.hospital.password_hash, undefined)
    assert.equal((await call('POST', '/admin/hospitals', hospital, { token: null, headers: admin })).status, 409)
    const list = await call('GET', '/admin/hospitals', undefined, { token: null, headers: admin })
    assert.ok(list.json.items.some((h: any) => h.email === 'bank@rhuh.example'))
    const login = await call('POST', '/auth/login', { email: hospital.email, password: hospital.password }, { token: null })
    assert.equal(login.status, 200)
    otherToken = login.json.token
  })

  it('changes the password and signs out older sessions', async () => {
    const wrong = await call('PATCH', '/auth/password', { currentPassword: 'nope', newPassword: 'second-password-2' }, { token: otherToken })
    assert.equal(wrong.status, 400, 'a wrong current password does not sign the user out')
    assert.equal((await call('PATCH', '/auth/password', { currentPassword: hospital.password, newPassword: 'short' }, { token: otherToken })).status, 400)
    const ok = await call('PATCH', '/auth/password', { currentPassword: hospital.password, newPassword: 'second-password-2' }, { token: otherToken })
    assert.equal(ok.status, 200)
    assert.equal((await call('GET', '/auth/me', undefined, { token: otherToken })).status, 401, 'the old token stops working')
    assert.equal((await call('GET', '/auth/me', undefined, { token: ok.json.token })).status, 200)
    assert.equal((await call('POST', '/auth/login', { email: hospital.email, password: hospital.password }, { token: null })).status, 401)
    otherToken = ok.json.token
  })

  it('lets the admin reset a password', async () => {
    const id = (await call('GET', '/auth/me', undefined, { token: otherToken })).json.hospital.id
    assert.equal((await call('POST', `/admin/hospitals/${id}/password`, { password: 'reset-password-3' }, { token: null, headers: admin })).status, 200)
    assert.equal((await call('GET', '/auth/me', undefined, { token: otherToken })).status, 401)
    assert.equal((await call('POST', '/auth/login', { email: hospital.email, password: 'reset-password-3' }, { token: null })).status, 200)
    assert.equal((await call('POST', '/admin/hospitals/99999/password', { password: 'reset-password-3' }, { token: null, headers: admin })).status, 404)
  })
})

describe('hospital settings', () => {
  it('reads and updates settings', async () => {
    const r = await call('GET', '/hospital')
    assert.equal(r.json.name, 'AUBMC Blood Bank')
    assert.equal(r.json.defaultRadiusKm, 20)
    assert.equal((await call('PATCH', '/hospital', { defaultRadiusKm: 7 })).status, 400)
    assert.equal((await call('PATCH', '/hospital', { email: 'x@y.z' })).status, 400, 'email cannot be changed here')
    const u = await call('PATCH', '/hospital', { defaultRadiusKm: 10, phone: '+961 1 350 000', address: 'Cairo Street, Hamra' })
    assert.equal(u.status, 200)
    assert.equal(u.json.defaultRadiusKm, 10)
    assert.equal(u.json.address, 'Cairo Street, Hamra')
    assert.equal(u.json.name, 'AUBMC Blood Bank', 'fields left out stay the same')
  })
})

describe('message templates', () => {
  it('lists defaults and validates edits', async () => {
    const r = await call('GET', '/templates')
    assert.ok(r.json.items.some((t: any) => t.key === 'eta_confirmed' && !t.custom))
    assert.equal(r.json.approved.request, 'blood_request_urgent_v2')
    assert.equal((await call('PUT', '/templates/nope', { body: 'Hi' })).status, 404)
    assert.equal((await call('PUT', '/templates/ask_eta', { body: 'Hi {nickname}' })).status, 400, 'unknown placeholder')
    assert.equal((await call('PUT', '/templates/eta_confirmed', { body: 'See you soon' })).status, 400, 'the reception code must stay')
    assert.equal((await call('PUT', '/templates/default_note', { body: 'Two\nlines' })).status, 400)
  })

  it('uses the custom wording in WhatsApp replies, and can reset it', async () => {
    const put = await call('PUT', '/templates/ask_eta', { body: 'Shukran {firstName}, what time suits you?' })
    assert.equal(put.status, 200)
    assert.equal(put.json.custom, true)
    assert.equal((await call('POST', '/requests', { ...requestBody, note: 'Gate 2' })).status, 201)
    const yes = (await outbox()).find((m) => m.body.includes('blood_request_urgent_v2')).buttons.find((b: any) => b.id.startsWith('yes:'))
    await call('POST', '/dev/simulate-reply', { requestDonorId: Number(yes.id.split(':')[1]), action: 'yes' }, { token: null })
    assert.match((await outbox())[0].body, /^Shukran \S+, what time suits you\?$/)
    const reset = await call('DELETE', '/templates/ask_eta')
    assert.equal(reset.json.custom, false)
    assert.equal(reset.json.body, reset.json.defaultBody)
  })
})

describe('donor profile', () => {
  it('masks personal details unless the donor confirmed for this hospital', async () => {
    const { revealed, masked } = await donorsByReveal()
    const m = (await call('GET', `/donors/${masked[0].id}`)).json
    assert.match(m.phone, /•••/)
    assert.equal(m.details, null)
    const r = (await call('GET', `/donors/${revealed[0].id}`)).json
    assert.match(r.phone, /^\+961/)
    assert.equal(typeof r.details.age, 'number')
    assert.ok(r.history.length > 0)
    assert.equal((await call('GET', '/donors/999999')).status, 404)
    assert.equal((await call('GET', '/donors/stats')).status, 200, '"stats" is not read as an id')
  })

  it('lets only that hospital record the blood type and last donation', async () => {
    const { revealed, masked } = await donorsByReveal()
    assert.equal((await call('PATCH', `/donors/${masked[0].id}`, { bloodType: 'A+' })).status, 403)
    assert.equal((await call('PATCH', `/donors/${revealed[0].id}`, {})).status, 400)
    assert.equal((await call('PATCH', `/donors/${revealed[0].id}`, { lastDonation: '2999-01-01' })).status, 400)
    assert.equal((await call('PATCH', `/donors/${revealed[0].id}`, { lastDonation: '2026-02-31' })).status, 400)
    assert.equal((await call('PATCH', `/donors/${revealed[0].id}`, { bloodType: 'unknown' })).status, 400)
    const day = new Date(Date.now() - 3 * 86_400_000).toISOString().slice(0, 10)
    const u = await call('PATCH', `/donors/${revealed[0].id}`, { bloodType: 'AB+', lastDonation: day })
    assert.equal(u.status, 200)
    assert.equal(u.json.bloodType, 'AB+')
    assert.equal(u.json.lastDonation, day)
    assert.ok(u.json.eligibleInDays > 50)
  })
})

describe('reports', () => {
  it('summarises the last 30 days', async () => {
    const r = await call('GET', '/reports/summary')
    assert.equal(r.status, 200)
    assert.equal(r.json.daily.length, 30)
    assert.ok(r.json.requests.total >= 5)
    assert.ok(r.json.units.requested >= r.json.units.collected)
    assert.ok(r.json.byBloodType.some((t: any) => t.bloodType === 'O-'))
    assert.ok(r.json.responseRate >= 0 && r.json.responseRate <= 100)
  })

  it('validates the range', async () => {
    assert.equal((await call('GET', '/reports/summary?from=2026-05-10&to=2026-05-01')).status, 400)
    assert.equal((await call('GET', '/reports/summary?from=2020-01-01&to=2026-01-01')).status, 400)
    assert.equal((await call('GET', '/reports/summary?from=yesterday')).status, 400)
    assert.equal((await call('GET', '/reports/summary?from=2026-02-30')).status, 400)
  })

  it('exports CSV that spreadsheets will not run as formulas', async () => {
    await call('POST', '/requests', { ...requestBody, patientRef: '=HYPERLINK("x")' })
    const r = await call('GET', '/reports/export.csv')
    assert.equal(r.status, 200)
    assert.match(r.headers.get('content-type') ?? '', /text\/csv/)
    assert.match(r.headers.get('content-disposition') ?? '', /attachment; filename="nabd-requests-/)
    const text = r.json as string
    assert.ok(text.replace(/^﻿/, '').startsWith('Request ID,Created (UTC),Blood type'))
    assert.ok(text.includes(`"'=HYPERLINK(""x"")"`))
    assert.equal((await call('GET', '/reports/export.csv', undefined, { token: null })).status, 401)
  })
})

describe('blood drives', () => {
  let driveId = 0
  const drive = { title: 'Hamra drive', city: 'Beirut', location: 'AUB main gate', startsAt: inDays(5, 8), endsAt: inDays(5, 14) }

  it('validates dates', async () => {
    assert.equal((await call('POST', '/drives', { ...drive, startsAt: inDays(-2), endsAt: inDays(-2, 12) })).status, 400)
    assert.equal((await call('POST', '/drives', { ...drive, endsAt: drive.startsAt })).status, 400)
    assert.equal((await call('POST', '/drives', { ...drive, endsAt: inDays(7) })).status, 400, 'at most 24 hours')
    assert.equal((await call('POST', '/drives', { ...drive, startsAt: 'next friday' })).status, 400)
  })

  it('creates and lists a drive', async () => {
    const r = await call('POST', '/drives', drive)
    assert.equal(r.status, 201)
    assert.equal(r.json.status, 'scheduled')
    driveId = r.json.id
    const list = await call('GET', '/drives')
    assert.ok(list.json.items.some((d: any) => d.id === driveId))
    assert.ok(list.json.items.some((d: any) => d.title === 'Winter blood drive'), 'the seeded drive is listed')
    assert.ok(!(await call('GET', '/drives?when=past')).json.items.some((d: any) => d.id === driveId))
  })

  it('invites nearby donors once, and records who will come', async () => {
    const dry = await call('POST', `/drives/${driveId}/invite`, { radiusKm: 10, dryRun: true })
    assert.ok(dry.json.wouldInvite > 0)
    const r = await call('POST', `/drives/${driveId}/invite`, { radiusKm: 10 })
    assert.equal(r.json.invited, dry.json.wouldInvite)
    assert.equal((await call('POST', `/drives/${driveId}/invite`, { radiusKm: 10 })).status, 400, 'nobody is invited twice')

    const msg = (await outbox()).find((m) => m.body.includes('blood_drive_invite_v1'))
    assert.match(msg.body, /Hamra drive/)
    const yes = msg.buttons.find((b: any) => b.id.startsWith('drive_yes:'))
    await call('POST', '/dev/simulate-reply', { requestDonorId: Number(yes.id.split(':')[1]), action: 'drive_yes' }, { token: null })
    assert.match((await outbox())[0].body, /See you at Hamra drive, AUB main gate/)

    const d = (await call('GET', `/drives/${driveId}`)).json
    assert.equal(d.stats.going, 1)
    assert.equal(d.going.length, 1)
    assert.match(d.going[0].name, /^\S+( \S\.)?$/, 'names stay shortened')
    assert.equal(d.going[0].phone, undefined)
  })

  it('stops accepting people once the drive is full', async () => {
    const full = (await call('POST', '/drives', { ...drive, title: 'Small drive', capacity: 1 })).json
    await call('POST', `/drives/${full.id}/invite`, { radiusKm: 5 })
    const ids = (await outbox())
      .filter((m) => m.body.includes('Small drive'))
      .map((m) => Number(m.buttons.find((b: any) => b.id.startsWith('drive_yes:')).id.split(':')[1]))
    assert.ok(ids.length >= 2)
    await call('POST', '/dev/simulate-reply', { requestDonorId: ids[0], action: 'drive_yes' }, { token: null })
    await call('POST', '/dev/simulate-reply', { requestDonorId: ids[1], action: 'drive_yes' }, { token: null })
    assert.match((await outbox())[0].body, /already full/)
    assert.equal((await call('GET', `/drives/${full.id}`)).json.stats.going, 1)
  })

  it('updates, cancels and hides drives from other hospitals', async () => {
    const u = await call('PATCH', `/drives/${driveId}`, { location: 'AUB West Hall', capacity: null })
    assert.equal(u.json.location, 'AUB West Hall')
    assert.equal(u.json.capacity, null)
    assert.equal((await call('PATCH', `/drives/${driveId}`, { endsAt: inDays(4) })).status, 400)

    const other = (await call('POST', '/auth/login', { email: 'bank@rhuh.example', password: 'reset-password-3' }, { token: null })).json.token
    assert.equal((await call('GET', `/drives/${driveId}`, undefined, { token: other })).status, 404)

    assert.equal((await call('DELETE', `/drives/${driveId}`)).json.status, 'cancelled')
    assert.equal((await call('DELETE', `/drives/${driveId}`)).status, 400)
    assert.equal((await call('POST', `/drives/${driveId}/invite`, { radiusKm: 30 })).status, 400)
  })
})
