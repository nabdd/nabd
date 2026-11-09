import { Module } from '@nestjs/common'
import { WhatsappModule } from '../whatsapp/whatsapp.module'
import { DonorsController } from './donors.controller'
import { DonorsService } from './donors.service'

@Module({
  imports: [WhatsappModule],
  controllers: [DonorsController],
  providers: [DonorsService],
})
export class DonorsModule {}
