import { Body, ConflictException, Controller, Get, HttpCode, NotFoundException, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { hashPassword } from '../auth/auth.service'
import { Public } from '../common/auth.decorators'
import { DatabaseService } from '../database/database.service'
import { AdminGuard } from './admin.guard'
import { CreateHospitalDto, ResetPasswordDto } from './admin.dto'

interface HospitalRow {
  id: number
  name: string
  email: string
  city: string
  phone: string | null
  created_at: string
}

const view = (h: HospitalRow) => ({ id: h.id, name: h.name, email: h.email, city: h.city, phone: h.phone, createdAt: h.created_at })

/** Platform admin: creates hospital accounts. Uses the admin token instead of a hospital sign-in. */
@Public()
@UseGuards(AdminGuard)
@Throttle({ default: { limit: 20, ttl: 60_000 } })
@Controller('admin/hospitals')
export class AdminController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  list() {
    return { items: this.db.all<HospitalRow>('SELECT id, name, email, city, phone, created_at FROM hospitals ORDER BY name').map(view) }
  }

  @Post()
  async create(@Body() dto: CreateHospitalDto) {
    const email = dto.email.trim().toLowerCase()
    if (this.db.get('SELECT id FROM hospitals WHERE email = ?', email)) throw new ConflictException('A hospital with this email already exists')
    const { id } = this.db.run(
      'INSERT INTO hospitals (name, email, password_hash, city, phone, address, created_at) VALUES (?,?,?,?,?,?,?)',
      dto.name.trim(), email, await hashPassword(dto.password), dto.city, dto.phone?.trim() || null, dto.address?.trim() || null, new Date().toISOString(),
    )
    return { hospital: view(this.db.get<HospitalRow>('SELECT * FROM hospitals WHERE id = ?', id)!) }
  }

  /** Sets a new password, for example when a hospital forgot theirs. Signs out all their sessions. */
  @HttpCode(200)
  @Post(':id/password')
  async resetPassword(@Param('id', ParseIntPipe) id: number, @Body() dto: ResetPasswordDto) {
    const r = this.db.run('UPDATE hospitals SET password_hash = ?, token_version = token_version + 1 WHERE id = ?', await hashPassword(dto.password), id)
    if (!r.changes) throw new NotFoundException('Hospital not found')
    return { ok: true }
  }
}
