import 'reflect-metadata'
import { Logger, ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import helmet from 'helmet'
import { AppModule } from './app.module'
import type { Env } from './config/env'

export async function createApp() {
  // rawBody is needed to check the signature Meta puts on webhook calls.
  const app = await NestFactory.create(AppModule, { rawBody: true, logger: ['error', 'warn', 'log'] })
  const config = app.get<ConfigService<Env, true>>(ConfigService)

  app.setGlobalPrefix('api')
  app.use(helmet())
  const origins = config.get('CORS_ORIGIN', { infer: true })
  if (origins) app.enableCors({ origin: origins.split(',').map((o) => o.trim()) })
  // Reject unknown fields and coerce types so handlers only ever see validated data.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  app.enableShutdownHooks()
  return app
}

async function bootstrap() {
  const app = await createApp()
  const port = app.get<ConfigService<Env, true>>(ConfigService).get('PORT', { infer: true })
  await app.listen(port)
  new Logger('Bootstrap').log(`API listening on http://localhost:${port}/api`)
}

if (require.main === module) void bootstrap()
