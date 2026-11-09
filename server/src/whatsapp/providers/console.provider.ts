import { Logger } from '@nestjs/common'
import type { Button, TemplateMessage, WhatsappProvider } from './provider'

export interface OutboxItem {
  id: string
  at: string
  to: string
  kind: 'template' | 'text' | 'buttons'
  body: string
  buttons?: Button[]
}

/** Development provider: logs messages and keeps the latest ones in memory instead of sending them. */
export class ConsoleProvider implements WhatsappProvider {
  readonly name = 'console'
  private readonly log = new Logger('WhatsApp(console)')
  private n = 0
  readonly outbox: OutboxItem[] = []

  private push(item: Omit<OutboxItem, 'id' | 'at'>) {
    const id = `console-${++this.n}`
    this.outbox.push({ id, at: new Date().toISOString(), ...item })
    if (this.outbox.length > 200) this.outbox.shift()
    this.log.log(`to ${item.to}: ${item.body.replace(/\s+/g, ' ').slice(0, 140)}`)
    return { id }
  }

  async sendTemplate(m: TemplateMessage) {
    return this.push({ to: m.to, kind: 'template', body: `[${m.template}] ${m.params.join(' | ')}`, buttons: m.buttons })
  }
  async sendText(to: string, body: string) {
    return this.push({ to, kind: 'text', body })
  }
  async sendButtons(to: string, body: string, buttons: Button[]) {
    return this.push({ to, kind: 'buttons', body, buttons })
  }
}
