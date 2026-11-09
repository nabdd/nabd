import { Module } from '@nestjs/common'
import { TemplatesModule } from '../templates/templates.module'
import { WhatsappModule } from '../whatsapp/whatsapp.module'
import { MatchingService } from './matching.service'
import { RequestsController } from './requests.controller'
import { RequestsService } from './requests.service'

@Module({
  imports: [WhatsappModule, TemplatesModule],
  controllers: [RequestsController],
  providers: [RequestsService, MatchingService],
  exports: [RequestsService],
})
export class RequestsModule {}
