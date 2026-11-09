import { Module } from '@nestjs/common'
import { WhatsappModule } from '../whatsapp/whatsapp.module'
import { DevController } from './dev.controller'

@Module({ imports: [WhatsappModule], controllers: [DevController] })
export class DevModule {}
