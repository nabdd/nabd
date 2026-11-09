import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Env } from '../config/env'
import type { Urgency } from '../common/blood'
import { CloudProvider } from './providers/cloud.provider'
import { ConsoleProvider } from './providers/console.provider'
import type { Button, WhatsappProvider } from './providers/provider'

export const urgencyPhrase = (u: Urgency) => (u === 'urgent' ? 'within 4 hours' : u === '24h' ? 'within 24 hours' : 'this week')

@Injectable()
export class WhatsappService {
  private readonly log = new Logger('WhatsApp')
  readonly provider: WhatsappProvider
  readonly urgentTemplate: string
  readonly verifyTemplate: string
  readonly driveTemplate: string

  constructor(config: ConfigService<Env, true>) {
    this.urgentTemplate = config.get('WHATSAPP_TEMPLATE_URGENT', { infer: true })
    this.verifyTemplate = config.get('WHATSAPP_TEMPLATE_VERIFY', { infer: true })
    this.driveTemplate = config.get('WHATSAPP_TEMPLATE_DRIVE', { infer: true })
    this.provider =
      config.get('WHATSAPP_PROVIDER', { infer: true }) === 'cloud'
        ? new CloudProvider(config.get('WHATSAPP_TOKEN', { infer: true }), config.get('WHATSAPP_PHONE_NUMBER_ID', { infer: true }))
        : new ConsoleProvider()
    this.log.log(`Provider: ${this.provider.name}`)
  }

  /** Recent messages when running with the console provider (empty otherwise). */
  get outbox() {
    return this.provider instanceof ConsoleProvider ? this.provider.outbox : []
  }

  /** Asks a new donor to reply YES once, which verifies the number. */
  sendVerification(to: string, firstName: string) {
    return this.provider.sendTemplate({ to, template: this.verifyTemplate, params: [firstName] })
  }

  /** The urgent request message. Variables {{1}}..{{7}}, see README. */
  sendRequest(opts: {
    to: string
    requestDonorId: number
    firstName: string
    hospital: string
    bloodType: string
    component: string
    units: number
    urgency: Urgency
    distanceKm: number
    note: string | null
  }) {
    const buttons: Button[] = [
      { id: `yes:${opts.requestDonorId}`, label: 'I can donate' },
      { id: `no:${opts.requestDonorId}`, label: 'Not this time' },
      { id: `pause:${opts.requestDonorId}`, label: 'Pause 30 days' },
    ]
    return this.provider.sendTemplate({
      to: opts.to,
      template: this.urgentTemplate,
      params: [
        opts.firstName,
        opts.hospital,
        `${opts.bloodType} ${opts.component.toLowerCase()}`,
        `${opts.units} ${opts.units === 1 ? 'unit' : 'units'}`,
        urgencyPhrase(opts.urgency),
        `${Math.max(1, Math.round(opts.distanceKm))} km`,
        opts.note?.trim() || 'Please come to the blood bank reception.',
      ],
      buttons,
    })
  }

  /** Blood drive invite. Variables {{1}}..{{5}}: first name, hospital, drive title, date, location. */
  sendDriveInvite(opts: { to: string; inviteId: number; firstName: string; hospital: string; title: string; date: string; location: string }) {
    return this.provider.sendTemplate({
      to: opts.to,
      template: this.driveTemplate,
      params: [opts.firstName, opts.hospital, opts.title, opts.date, opts.location],
      buttons: [
        { id: `drive_yes:${opts.inviteId}`, label: 'I will come' },
        { id: `drive_no:${opts.inviteId}`, label: 'Not this time' },
      ],
    })
  }
}
