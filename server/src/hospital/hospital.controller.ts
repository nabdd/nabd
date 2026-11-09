import { Body, Controller, Get, Patch } from '@nestjs/common'
import { AuthedHospital, CurrentHospital } from '../common/auth.decorators'
import { DatabaseService } from '../database/database.service'
import { UpdateHospitalDto } from './hospital.dto'

interface HospitalRow {
  id: number
  name: string
  email: string
  city: string
  phone: string | null
  address: string | null
  default_radius_km: number
  default_min_days: number
  created_at: string
}

/** Settings of the signed-in hospital. */
@Controller('hospital')
export class HospitalController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  get(@CurrentHospital() h: AuthedHospital) {
    const r = this.db.get<HospitalRow>('SELECT * FROM hospitals WHERE id = ?', h.id)!
    return {
      id: r.id,
      name: r.name,
      email: r.email,
      city: r.city,
      phone: r.phone,
      address: r.address,
      defaultRadiusKm: r.default_radius_km,
      defaultMinDays: r.default_min_days,
      createdAt: r.created_at,
    }
  }

  @Patch()
  update(@CurrentHospital() h: AuthedHospital, @Body() dto: UpdateHospitalDto) {
    // Fixed column list: field names never come from the request into the SQL.
    const fields: [string, string | number | null | undefined][] = [
      ['name', dto.name?.trim()],
      ['city', dto.city],
      ['phone', dto.phone === undefined ? undefined : dto.phone.trim() || null],
      ['address', dto.address === undefined ? undefined : dto.address.trim() || null],
      ['default_radius_km', dto.defaultRadiusKm],
      ['default_min_days', dto.defaultMinDays],
    ]
    const set = fields.filter(([, v]) => v !== undefined) as [string, string | number | null][]
    if (set.length) this.db.run(`UPDATE hospitals SET ${set.map(([c]) => `${c} = ?`).join(', ')} WHERE id = ?`, ...set.map(([, v]) => v), h.id)
    return this.get(h)
  }
}
