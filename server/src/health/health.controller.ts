import { Controller, Get } from '@nestjs/common'
import { SkipThrottle } from '@nestjs/throttler'
import { Public } from '../common/auth.decorators'
import { DatabaseService } from '../database/database.service'

/** For the hosting platform's health check. Answers 500 if the database cannot be read. */
@Public()
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  check() {
    this.db.get('SELECT 1')
    return { status: 'ok', time: new Date().toISOString() }
  }
}
