import { Body, Controller, ForbiddenException, Get, HttpCode, Logger, Post, Query, RawBodyRequest, Req, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SkipThrottle } from '@nestjs/throttler'
import { createHmac, timingSafeEqual } from 'node:crypto'
import type { Request } from 'express'
import { Public } from '../common/auth.decorators'
import type { Env } from '../config/env'
import { RepliesService } from './replies.service'

interface Incoming {
  from: string
  type: string
  text?: { body?: string }
  button?: { payload?: string }
  interactive?: { button_reply?: { id?: string } }
}
interface Webhook {
  entry?: { changes?: { value?: { messages?: Incoming[] } }[] }[]
}

@Public()
@SkipThrottle()
@Controller('webhooks/whatsapp')
export class WebhookController {
  private readonly log = new Logger('Webhook')

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly replies: RepliesService,
  ) {}

  /** Meta calls this once when you register the webhook URL. */
  @Get()
  verify(@Query('hub.mode') mode?: string, @Query('hub.verify_token') token?: string, @Query('hub.challenge') challenge?: string) {
    const expected = this.config.get('WHATSAPP_VERIFY_TOKEN', { infer: true })
    if (mode === 'subscribe' && expected && token === expected && challenge) return challenge
    throw new ForbiddenException()
  }

  @Post()
  @HttpCode(200)
  async receive(@Req() req: RawBodyRequest<Request>, @Body() body: Webhook) {
    this.assertSignature(req)
    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        for (const m of change.value?.messages ?? []) {
          const from = `+${String(m.from ?? '').replace(/\D/g, '')}`
          try {
            const payload = m.button?.payload ?? m.interactive?.button_reply?.id
            if (payload) await this.replies.handleButton(payload, from)
            else if (m.type === 'text' && m.text?.body) await this.replies.handleText(from, m.text.body)
          } catch (e) {
            // Always answer 200 so Meta does not retry the whole batch; log and continue.
            this.log.error(`Failed to process an incoming message: ${(e as Error).message}`)
          }
        }
      }
    }
    return { received: true }
  }

  /** Meta signs every delivery with the app secret. Reject anything that does not match. */
  private assertSignature(req: RawBodyRequest<Request>) {
    const secret = this.config.get('WHATSAPP_APP_SECRET', { infer: true })
    if (!secret) {
      if (this.config.get('NODE_ENV', { infer: true }) === 'production') throw new UnauthorizedException()
      return // development without a secret: accept unsigned calls
    }
    const given = String(req.headers['x-hub-signature-256'] ?? '')
    const expected = 'sha256=' + createHmac('sha256', secret).update(req.rawBody ?? Buffer.alloc(0)).digest('hex')
    const a = Buffer.from(given)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new UnauthorizedException()
  }
}
