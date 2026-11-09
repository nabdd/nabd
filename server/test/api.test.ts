import './setup-env'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { after, before, describe, it } from 'node:test'
import type { INestApplication } from '@nestjs/common'
import { createApp } from '../src/main'

let app: INestApplication
let base = ''
let token = ''

const call = async (method: string, path: string, body?: unknown, opts: { auth?: boolean; headers?: Record<string, string>; raw?: string } = {}) => {
  const res = await fetch(`${base}/api${path}`, {
    method,
    headers: {
      ...(body !== undefined || opts.raw ? { 'Content-Type': 'application/json' } : {}),
      ...(opts.auth !== false && token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
    body: opts.raw ?? (body !== undefined ? JSON.stringify(body) : undefined),
  })
  const text = await res.text()
  let json: any
  try {
    json = JSON.parse(text)
  } catch {
    json = text
  }
  return { status: res.status, json }
}

const requestBody = { bloodType: 'O-', includeCompatible: true, component: 'Whole blood', units: 2, urgency: 'urgent', radiusKm: 20, minDays: 56, patientRef: 'ER-1', note: 'Building C' }

before(async () => {
  app = await createApp()
  await app.listen(0)
  const addr = app.getHttpServer().address() as { port: number }
  base = `http://127.0.0.1:${addr.port}`
})
after(async () => {
  await app.close()
})

describe('auth', () => {
  it('rejects requests without a token', async () => {
    assert.equal((await call('GET', '/requests', undefined, { auth: false })).status, 401)
  })
  it('rejects a wrong password and unknown email the same way', async () => {
    const a = await call('POST', '/auth/login', { email: 'bloodbank@aubmc.org.lb', password: 'nope' }, { auth: false })
    const b = await call('POST', '/auth/login', { email: 'nobody@example.com', password: 'nope' }, { auth: false })
    assert.equal(a.status, 401)
    assert.equal(b.status, 401)
    assert.equal(a.json.message, b.json.message)
  })
  it('signs in the demo hospital', async () => {
    const r = await call('POST', '/auth/login', { email: 'BloodBank@aubmc.org.lb', password: 'nabd-demo-2026' }, { auth: false })
    assert.equal(r.status, 200)
    assert.ok(r.json.token)
    assert.equal(r.json.hospital.name, 'AUBMC Blood Bank')
    assert.equal(r.json.hospital.password_hash, undefined)
    token = r.json.token
  })
  it('rejects a tampered token', async () => {
    const r = await call('GET', '/auth/me', undefined, { headers: { Authorization: `Bearer ${token}x` } })
    assert.equal(r.status, 401)
  })
})

describe('donor sign-up (public)', () => {
  const ok = { name: 'Test Donor', age: 30, phone: '70 555 123', bloodType: 'O-', city: 'Beirut', smoker: false, donatedBefore: true, consent: true }
  it('validates input', async () => {
    assert.equal((await call('POST', '/donors', { ...ok, age: 12 }, { auth: false })).status, 400)
    assert.equal((await call('POST', '/donors', { ...ok, consent: false }, { auth: false })).status, 400)
    assert.equal((await call('POST', '/donors', { ...ok, bloodType: 'Z+' }, { auth: false })).status, 400)
    assert.equal((await call('POST', '/donors', { ...ok, isAdmin: true }, { auth: false })).status, 400, 'unknown fields are rejected')
    assert.equal((await call('POST', '/donors', { ...ok, phone: '123' }, { auth: false })).status, 400)
  })
  it('registers a donor and answers identically for a repeat number', async () => {
    const a = await call('POST', '/donors', ok, { auth: false })
    const b = await call('POST', '/donors', ok, { auth: false })
    assert.equal(a.status, 201)
    assert.deepEqual(a.json, b.json)
    assert.equal(a.json.firstName, 'Test')
  })
  it('sends a verification message and keeps unverified donors out of matching', async () => {
    const outbox = (await call('GET', '/dev/outbox', undefined, { auth: false })).json.messages
    assert.ok(outbox.some((m: any) => m.to === '+96170555123' && m.body.includes('donor_verify_v1')))
    const all = await call('GET', '/donors?pageSize=100')
    assert.ok(!all.json.items.some((d: any) => d.name.startsWith('Test D')), 'unverified donors are not listed')
  })
})

describe('requests', () => {
  let requestId = 0
  let responseId = 0

  it('previews matches with masked contact details', async () => {
    const r = await call('POST', '/requests/preview', { bloodType: 'O-', includeCompatible: true, radiusKm: 20, minDays: 56 })
    assert.equal(r.status, 200)
    assert.ok(r.json.total > 0)
    for (const d of r.json.donors) {
      assert.match(d.phone, /•••/)
      assert.match(d.name, /^\S+( \S\.)?$/)
      assert.ok(['O-', 'O+'].includes(d.bloodType))
    }
    const wider = await call('POST', '/requests/preview', { bloodType: 'O-', includeCompatible: true, radiusKm: 30, minDays: 56 })
    assert.ok(wider.json.total >= r.json.total, 'a wider radius never reaches fewer donors')
  })

  it('rejects an invalid request', async () => {
    assert.equal((await call('POST', '/requests', { ...requestBody, units: 0 })).status, 400)
    assert.equal((await call('POST', '/requests', { ...requestBody, urgency: 'whenever' })).status, 400)
    assert.equal((await call('POST', '/requests', { ...requestBody, radiusKm: 7 })).status, 400)
  })

  it('creates a request and sends WhatsApp messages to eligible donors only', async () => {
    const before = (await call('GET', '/dev/outbox', undefined, { auth: false })).json.messages.length
    const r = await call('POST', '/requests', requestBody)
    assert.equal(r.status, 201)
    assert.ok(r.json.sent > 0)
    assert.equal(r.json.failed, 0)
    requestId = r.json.id
    const msgs = (await call('GET', '/dev/outbox', undefined, { auth: false })).json.messages
    assert.ok(msgs.length > before)
    const sample = msgs.find((m: any) => m.body.includes('blood_request_urgent_v2'))
    assert.ok(sample.buttons.some((b: any) => b.id.startsWith('yes:')))
    assert.match(sample.body, /AUBMC Blood Bank/)
  })

  it('ignores donor ids that are not real matches', async () => {
    const r = await call('POST', '/requests', { ...requestBody, donorIds: [999999] })
    assert.equal(r.status, 400)
  })

  it('shows a new request as open with nobody confirmed yet', async () => {
    const r = await call('GET', `/requests/${requestId}`)
    assert.equal(r.json.request.status, 'open')
    assert.equal(r.json.stats.canDonate, 0)
    assert.equal(r.json.responses.length, 0)
    assert.ok(r.json.stats.pending > 0)
  })

  it('handles a donor tapping yes, then choosing a time, and reveals only that donor', async () => {
    const msgs = (await call('GET', '/dev/outbox', undefined, { auth: false })).json.messages
    const yes = msgs.find((m: any) => m.body.includes('blood_request_urgent_v2')).buttons.find((b: any) => b.id.startsWith('yes:'))
    responseId = Number(yes.id.split(':')[1])
    assert.equal((await call('POST', '/dev/simulate-reply', { requestDonorId: responseId, action: 'yes' }, { auth: false })).status, 201)
    let d = (await call('GET', `/requests/${requestId}`)).json
    assert.equal(d.responses.length, 1)
    assert.equal(d.responses[0].status, 'confirmed')
    assert.match(d.responses[0].phone, /^\+961\d{7,8}$/, 'confirmed donor contact is revealed')
    assert.match(d.responses[0].receptionCode, /^NB-\d{4}$/)

    await call('POST', '/dev/simulate-reply', { requestDonorId: responseId, action: 'eta_1h' }, { auth: false })
    d = (await call('GET', `/requests/${requestId}`)).json
    assert.equal(d.responses[0].status, 'enroute')
    assert.equal(d.responses[0].eta, 'Within 1 hour')
    const followUp = (await call('GET', '/dev/outbox', undefined, { auth: false })).json.messages
    assert.ok(followUp.some((m: any) => m.body.includes('Show this code at reception')))
  })

  it('records a free-text question for the hospital', async () => {
    const detail = (await call('GET', `/requests/${requestId}`)).json
    const phone = detail.responses[0].phone
    await call('POST', '/dev/simulate-text', { phone, text: 'Which entrance?' }, { auth: false })
    const after = (await call('GET', `/requests/${requestId}`)).json
    assert.ok(after.activity.some((a: any) => a.flag === 'Needs reply' && a.text.includes('Which entrance?')))
  })

  it('marks arrival and counts the unit', async () => {
    assert.equal((await call('POST', `/requests/${requestId}/responses/${responseId}/arrived`)).status, 201)
    const d = (await call('GET', `/requests/${requestId}`)).json
    assert.equal(d.stats.collected, 1)
    assert.equal((await call('POST', `/requests/${requestId}/responses/${responseId}/arrived`)).status, 400, 'cannot donate twice')
  })

  it('lists the request and dashboard numbers', async () => {
    const list = await call('GET', '/requests?status=open')
    assert.ok(list.json.items.some((r: any) => r.id === requestId))
    assert.ok(list.json.counts.open >= 3)
    const dash = (await call('GET', '/stats/dashboard')).json
    assert.ok(dash.openRequests >= 3)
    assert.ok(dash.notifiedToday > 0)
  })

  it('does not expose other ids and rejects bad ones', async () => {
    assert.equal((await call('GET', '/requests/99999')).status, 404)
    assert.equal((await call('GET', '/requests/abc')).status, 400)
  })

  it('stops accepting replies once fulfilled', async () => {
    assert.equal((await call('PATCH', `/requests/${requestId}/fulfill`)).status, 200)
    assert.equal((await call('PATCH', `/requests/${requestId}/fulfill`)).status, 400)
    const before = (await call('GET', '/dev/outbox', undefined, { auth: false })).json.messages.length
    await call('POST', '/dev/simulate-reply', { requestDonorId: responseId, action: 'no' }, { auth: false })
    const msgs = (await call('GET', '/dev/outbox', undefined, { auth: false })).json.messages
    assert.ok(msgs.length > before)
    assert.match(msgs[0].body, /closed/)
  })
})

describe('donor directory privacy', () => {
  it('masks contact details unless the donor confirmed for this hospital', async () => {
    const r = await call('GET', '/donors?pageSize=100')
    assert.equal(r.status, 200)
    const masked = r.json.items.filter((d: any) => !d.contactRevealed)
    const revealed = r.json.items.filter((d: any) => d.contactRevealed)
    assert.ok(masked.length > 0 && revealed.length > 0)
    for (const d of masked) assert.match(d.phone, /•••/)
    for (const d of revealed) assert.match(d.phone, /^\+961/)
  })
  it('filters by blood type and reports counts', async () => {
    const r = await call('GET', '/donors?type=O-&pageSize=100')
    assert.ok(r.json.items.every((d: any) => d.bloodType === 'O-'))
    const s = (await call('GET', '/donors/stats')).json
    assert.ok(s.total > 0 && s.byType['O+'] > 0)
  })
})

describe('whatsapp webhook', () => {
  const body = JSON.stringify({ entry: [{ changes: [{ value: { messages: [] } }] }] })
  const sign = (b: string, secret = 'test-app-secret') => 'sha256=' + createHmac('sha256', secret).update(b).digest('hex')

  it('answers the subscription handshake only with the right token', async () => {
    const ok = await fetch(`${base}/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=12345`)
    assert.equal(await ok.text(), '12345')
    const bad = await fetch(`${base}/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=12345`)
    assert.equal(bad.status, 403)
  })
  it('rejects unsigned or wrongly signed deliveries', async () => {
    assert.equal((await call('POST', '/webhooks/whatsapp', undefined, { auth: false, raw: body })).status, 401)
    assert.equal((await call('POST', '/webhooks/whatsapp', undefined, { auth: false, raw: body, headers: { 'x-hub-signature-256': sign(body, 'other') } })).status, 401)
  })
  it('accepts a correctly signed delivery', async () => {
    assert.equal((await call('POST', '/webhooks/whatsapp', undefined, { auth: false, raw: body, headers: { 'x-hub-signature-256': sign(body) } })).status, 200)
  })
})
