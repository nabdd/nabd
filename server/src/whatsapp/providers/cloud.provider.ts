import { Logger } from '@nestjs/common'
import type { Button, TemplateMessage, WhatsappProvider } from './provider'

const GRAPH = 'https://graph.facebook.com/v21.0'

/**
 * WhatsApp Business Cloud API.
 * Not exercised against Meta in automated tests: it needs a real business account, an approved template
 * and a phone number id. See the README for the template layout this expects.
 */
export class CloudProvider implements WhatsappProvider {
  readonly name = 'cloud'
  private readonly log = new Logger('WhatsApp(cloud)')

  constructor(
    private readonly token: string,
    private readonly phoneNumberId: string,
  ) {}

  private async post(body: Record<string, unknown>): Promise<{ id: string }> {
    const res = await fetch(`${GRAPH}/${this.phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', ...body }),
      signal: AbortSignal.timeout(10_000),
    })
    const json = (await res.json().catch(() => ({}))) as { messages?: { id: string }[]; error?: { message?: string; code?: number } }
    if (!res.ok || !json.messages?.[0]) {
      // Log the API error but never the token or the message body (it contains personal data).
      this.log.error(`Send failed (${res.status}): ${json.error?.message ?? 'unknown error'} code=${json.error?.code ?? '-'}`)
      throw new Error(`WhatsApp send failed (${res.status})`)
    }
    return { id: json.messages[0].id }
  }

  private digits = (e164: string) => e164.replace(/^\+/, '')

  sendTemplate(m: TemplateMessage) {
    const components: unknown[] = [{ type: 'body', parameters: m.params.map((text) => ({ type: 'text', text })) }]
    ;(m.buttons ?? []).forEach((b, i) =>
      components.push({ type: 'button', sub_type: 'quick_reply', index: String(i), parameters: [{ type: 'payload', payload: b.id }] }),
    )
    return this.post({ to: this.digits(m.to), type: 'template', template: { name: m.template, language: { code: 'en' }, components } })
  }

  sendText(to: string, body: string) {
    return this.post({ to: this.digits(to), type: 'text', text: { body, preview_url: false } })
  }

  sendButtons(to: string, body: string, buttons: Button[]) {
    return this.post({
      to: this.digits(to),
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: body },
        action: { buttons: buttons.slice(0, 3).map((b) => ({ type: 'reply', reply: { id: b.id, title: b.label.slice(0, 20) } })) },
      },
    })
  }
}
