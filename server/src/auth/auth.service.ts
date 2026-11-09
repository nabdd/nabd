import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { compare, hash, hashSync } from 'bcryptjs'
import type { AuthedHospital } from '../common/auth.decorators'
import { DatabaseService } from '../database/database.service'

interface HospitalRow {
  id: number
  name: string
  email: string
  password_hash: string
  city: string
  token_version: number
}

// Compared against when the email is unknown, so response time does not reveal which emails exist.
const DUMMY_HASH = hashSync('not-a-real-password', 10)

export const hashPassword = (password: string) => hash(password, 10)

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwt: JwtService,
  ) {}

  private sign(h: { id: number; token_version: number }) {
    return this.jwt.signAsync({ sub: h.id, v: h.token_version })
  }

  async login(email: string, password: string) {
    const h = this.db.get<HospitalRow>('SELECT * FROM hospitals WHERE email = ?', email.trim().toLowerCase())
    const ok = await compare(password, h?.password_hash ?? DUMMY_HASH)
    if (!h || !ok) throw new UnauthorizedException('Wrong email or password')
    return { token: await this.sign(h), hospital: { id: h.id, name: h.name, email: h.email, city: h.city } }
  }

  /** Changes the password and signs out every other session. Returns a fresh token for this one. */
  async changePassword(authed: AuthedHospital, current: string, next: string) {
    const h = this.db.get<HospitalRow>('SELECT * FROM hospitals WHERE id = ?', authed.id)!
    // 400, not 401: the session is valid, only the typed password is wrong.
    if (!(await compare(current, h.password_hash))) throw new BadRequestException('Current password is wrong')
    if (current === next) throw new BadRequestException('Choose a password different from the current one')
    const version = h.token_version + 1
    this.db.run('UPDATE hospitals SET password_hash = ?, token_version = ? WHERE id = ?', await hashPassword(next), version, h.id)
    return { token: await this.sign({ id: h.id, token_version: version }) }
  }
}
