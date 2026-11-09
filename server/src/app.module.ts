import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { AdminModule } from './admin/admin.module'
import { AuthModule } from './auth/auth.module'
import { validateEnv } from './config/env'
import { DatabaseModule } from './database/database.module'
import { DevModule } from './dev/dev.module'
import { DonorsModule } from './donors/donors.module'
import { DrivesModule } from './drives/drives.module'
import { HealthController } from './health/health.controller'
import { HospitalModule } from './hospital/hospital.module'
import { ReportsModule } from './reports/reports.module'
import { RequestsModule } from './requests/requests.module'
import { TemplatesModule } from './templates/templates.module'
import { WhatsappModule } from './whatsapp/whatsapp.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv, ignoreEnvFile: false }),
    // Global ceiling per IP. Sensitive routes set tighter limits with @Throttle().
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 240 }]),
    DatabaseModule,
    AuthModule,
    AdminModule,
    HospitalModule,
    WhatsappModule,
    TemplatesModule,
    DonorsModule,
    RequestsModule,
    ReportsModule,
    DrivesModule,
    DevModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
