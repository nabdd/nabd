import { CanActivate, ExecutionContext, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createHash, timingSafeEqual } from 'node:crypto'
import type { Request } from 'express'
import type { Env } from '../config/env'

const digest = (s: string) => createHash('sha256').update(s).digest()

/**
 * Admin routes need the X-Admin-Token header to match ADMIN_TOKEN.
 * Without ADMIN_TOKEN configured they answer 404, as if they did not exist.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly config: ConfigService<Env, true>) {}

  canActivate(ctx: ExecutionContext) {
    const expected = this.config.get('ADMIN_TOKEN', { infer: true })
    if (!expected) throw new NotFoundException()
    const given = String(ctx.switchToHttp().getRequest<Request>().headers['x-admin-token'] ?? '')
    // Hashing first gives equal lengths, so the comparison time does not leak the token length.
    if (!given || !timingSafeEqual(digest(given), digest(expected))) throw new UnauthorizedException('Invalid admin token')
    return true
  }
}
