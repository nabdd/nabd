import { Body, Controller, Get, NotFoundException, Post } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { IsInt, IsString, MaxLength } from 'class-validator'
import { Public } from '../common/auth.decorators'
import type { Env } from '../config/env'
import { RepliesService } from '../whatsapp/replies.service'
import { WhatsappService } from '../whatsapp/whatsapp.service'

class SimulateButtonDto {
  @IsInt()
  requestDonorId!: number

  /** yes, no, pause, eta_1h, eta_today or eta_tomorrow */
  @IsString()
  @MaxLength(20)
  action!: string
}

class SimulateTextDto {
  @IsString()
  @MaxLength(25)
  phone!: string

  @IsString()
  @MaxLength(300)
  text!: string
}

/**
 * Lets you play the donor side without a real WhatsApp number. Disabled in production:
 * every route answers 404 there, as if it did not exist.
 */
@Public()
@Controller('dev')
export class DevController {
  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly replies: RepliesService,
    private readonly wa: WhatsappService,
  ) {}

  private guard() {
    if (this.config.get('NODE_ENV', { infer: true }) === 'production') throw new NotFoundException()
  }

  @Get('outbox')
  outbox() {
    this.guard()
    return { provider: this.wa.provider.name, messages: this.wa.outbox.slice(-50).reverse() }
  }

  @Post('simulate-reply')
  async reply(@Body() dto: SimulateButtonDto) {
    this.guard()
    await this.replies.handleButton(`${dto.action}:${dto.requestDonorId}`)
    return { ok: true }
  }

  @Post('simulate-text')
  async text(@Body() dto: SimulateTextDto) {
    this.guard()
    await this.replies.handleText(dto.phone.startsWith('+') ? dto.phone : `+${dto.phone}`, dto.text)
    return { ok: true }
  }
}
