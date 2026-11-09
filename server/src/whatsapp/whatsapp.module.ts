import { Module } from '@nestjs/common'
import { TemplatesModule } from '../templates/templates.module'
import { RepliesService } from './replies.service'
import { WebhookController } from './webhook.controller'
import { WhatsappService } from './whatsapp.service'

@Module({
  imports: [TemplatesModule],
  controllers: [WebhookController],
  providers: [WhatsappService, RepliesService],
  exports: [WhatsappService, RepliesService],
})
export class WhatsappModule {}
