import { Module } from '@nestjs/common'
import { RequestsModule } from '../requests/requests.module'
import { ReportsController } from './reports.controller'
import { ReportsService } from './reports.service'

@Module({
  imports: [RequestsModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
