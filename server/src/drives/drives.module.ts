import { Module } from '@nestjs/common'
import { WhatsappModule } from '../whatsapp/whatsapp.module'
import { DrivesController } from './drives.controller'
import { DrivesService } from './drives.service'

@Module({
  imports: [WhatsappModule],
  controllers: [DrivesController],
  providers: [DrivesService],
})
export class DrivesModule {}
