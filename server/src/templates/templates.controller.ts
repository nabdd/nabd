import { Body, Controller, Delete, Get, Param, Put } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { IsString, MaxLength } from 'class-validator'
import { AuthedHospital, CurrentHospital } from '../common/auth.decorators'
import type { Env } from '../config/env'
import { TemplatesService } from './templates.service'

class UpdateTemplateDto {
  @IsString()
  @MaxLength(500)
  body!: string
}

@Controller('templates')
export class TemplatesController {
  constructor(
    private readonly templates: TemplatesService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Get()
  list(@CurrentHospital() h: AuthedHospital) {
    return {
      items: this.templates.list(h.id),
      // First messages use these Meta-approved templates. Their wording is changed in the Meta dashboard.
      approved: {
        request: this.config.get('WHATSAPP_TEMPLATE_URGENT', { infer: true }),
        verification: this.config.get('WHATSAPP_TEMPLATE_VERIFY', { infer: true }),
        drive: this.config.get('WHATSAPP_TEMPLATE_DRIVE', { infer: true }),
      },
    }
  }

  @Put(':key')
  update(@CurrentHospital() h: AuthedHospital, @Param('key') key: string, @Body() dto: UpdateTemplateDto) {
    return this.templates.set(h.id, key, dto.body)
  }

  /** Back to the default wording. */
  @Delete(':key')
  reset(@CurrentHospital() h: AuthedHospital, @Param('key') key: string) {
    return this.templates.reset(h.id, key)
  }
}
