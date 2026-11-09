import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { DatabaseService } from '../database/database.service'

interface Definition {
  label: string
  body: string
  /** Placeholders the text may use, written as {name}. */
  variables: string[]
  /** Placeholders the text must keep, because the donor needs them. */
  required?: string[]
  /** Goes inside a Meta template variable, which may not contain line breaks. */
  singleLine?: boolean
}

/**
 * Texts a hospital can reword. The first message of a request or drive is a template approved by Meta
 * and cannot be edited here; these are the replies sent inside the conversation the donor opened.
 */
export const TEMPLATES = {
  default_note: {
    label: 'Instructions in the request message, when the request has no note',
    body: 'Please come to the blood bank reception.',
    variables: [],
    singleLine: true,
  },
  ask_eta: {
    label: 'After the donor taps "I can donate"',
    body: 'Thank you {firstName}! When can you arrive?',
    variables: ['firstName'],
  },
  eta_confirmed: {
    label: 'After the donor picks a time',
    body: 'Great. {hospital} is expecting you. Show this code at reception: {code}',
    variables: ['firstName', 'hospital', 'code'],
    required: ['code'],
  },
  declined: {
    label: 'After the donor taps "Not this time"',
    body: 'No problem, thank you for answering.',
    variables: ['firstName'],
  },
  paused: {
    label: 'After the donor taps "Pause 30 days"',
    body: 'Understood. We will not message you for 30 days.',
    variables: ['firstName'],
  },
  closed: {
    label: 'When the donor answers a request that is already closed',
    body: 'This request is closed. Thank you for answering.',
    variables: ['firstName'],
  },
  drive_going: {
    label: 'After the donor says they will come to a blood drive',
    body: 'Thank you {firstName}! See you at {title}, {location}, on {date}.',
    variables: ['firstName', 'title', 'location', 'date'],
  },
  drive_declined: {
    label: 'After the donor declines a blood drive',
    body: 'No problem, thank you for answering.',
    variables: ['firstName'],
  },
} satisfies Record<string, Definition>

export type TemplateKey = keyof typeof TEMPLATES
export const TEMPLATE_KEYS = Object.keys(TEMPLATES) as TemplateKey[]

const PLACEHOLDER = /\{(\w+)\}/g

@Injectable()
export class TemplatesService {
  constructor(private readonly db: DatabaseService) {}

  private def(key: string): Definition {
    if (!(TEMPLATE_KEYS as string[]).includes(key)) throw new NotFoundException('Unknown template')
    return TEMPLATES[key as TemplateKey]
  }

  private custom(hospitalId: number, key: string) {
    return this.db.get<{ body: string; updated_at: string }>('SELECT body, updated_at FROM message_templates WHERE hospital_id = ? AND key = ?', hospitalId, key)
  }

  list(hospitalId: number) {
    const saved = new Map(
      this.db.all<{ key: string; body: string; updated_at: string }>('SELECT key, body, updated_at FROM message_templates WHERE hospital_id = ?', hospitalId).map((r) => [r.key, r]),
    )
    return TEMPLATE_KEYS.map((key) => this.view(key, saved.get(key)))
  }

  private view(key: string, saved?: { body: string; updated_at: string }) {
    const d = this.def(key)
    return {
      key,
      label: d.label,
      body: saved?.body ?? d.body,
      defaultBody: d.body,
      custom: !!saved,
      variables: d.variables,
      required: d.required ?? [],
      updatedAt: saved?.updated_at ?? null,
    }
  }

  set(hospitalId: number, key: string, raw: string) {
    const d = this.def(key)
    const body = raw.trim()
    if (!body) throw new BadRequestException('The text cannot be empty')
    if (d.singleLine && /[\r\n\t]/.test(body)) throw new BadRequestException('This text must stay on one line')
    const used = [...body.matchAll(PLACEHOLDER)].map((m) => m[1])
    const unknown = used.filter((v) => !d.variables.includes(v))
    if (unknown.length) {
      throw new BadRequestException(`Unknown placeholder {${unknown[0]}}. ${d.variables.length ? `You can use ${d.variables.map((v) => `{${v}}`).join(', ')}.` : 'This text has no placeholders.'}`)
    }
    const missing = (d.required ?? []).filter((v) => !used.includes(v))
    if (missing.length) throw new BadRequestException(`Keep {${missing[0]}} in the text, the donor needs it`)
    this.db.run(
      `INSERT INTO message_templates (hospital_id, key, body, updated_at) VALUES (?,?,?,?)
       ON CONFLICT (hospital_id, key) DO UPDATE SET body = excluded.body, updated_at = excluded.updated_at`,
      hospitalId, key, body, new Date().toISOString(),
    )
    return this.view(key, this.custom(hospitalId, key))
  }

  reset(hospitalId: number, key: string) {
    this.def(key)
    this.db.run('DELETE FROM message_templates WHERE hospital_id = ? AND key = ?', hospitalId, key)
    return this.view(key)
  }

  /** The hospital's wording (or the default) with placeholders filled in. */
  render(hospitalId: number, key: TemplateKey, vars: Record<string, string | number> = {}) {
    const body = this.custom(hospitalId, key)?.body ?? TEMPLATES[key].body
    return body.replace(PLACEHOLDER, (all, name: string) => (name in vars ? String(vars[name]) : all))
  }
}
