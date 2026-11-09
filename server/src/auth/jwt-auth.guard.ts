import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'
import type { Request } from 'express'
import { IS_PUBLIC } from '../common/auth.decorators'
import { DatabaseService } from '../database/database.service'

interface Payload {
  sub: number
  /** hospitals.token_version when the token was issued. */
  v?: number
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly db: DatabaseService,
  ) {}

  async canActivate(ctx: ExecutionContext) {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()])) return true
    const req = ctx.switchToHttp().getRequest<Request & { hospital?: unknown }>()
    const [scheme, token] = (req.headers.authorization ?? '').split(' ')
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException('Sign in required')
    let payload: Payload
    try {
      payload = await this.jwt.verifyAsync<Payload>(token)
    } catch {
      throw new UnauthorizedException('Session expired, sign in again')
    }
    // Re-check the account on every request so removed hospitals lose access immediately.
    const h = this.db.get<{ id: number; name: string; city: string; token_version: number }>('SELECT id, name, city, token_version FROM hospitals WHERE id = ?', payload.sub)
    if (!h) throw new UnauthorizedException('Account no longer exists')
    // The password changed after this token was issued.
    if ((payload.v ?? 0) !== h.token_version) throw new UnauthorizedException('Session expired, sign in again')
    req.hospital = { id: h.id, name: h.name, city: h.city }
    return true
  }
}
