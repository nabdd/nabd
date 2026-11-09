import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { AuthedHospital, CurrentHospital, Public } from '../common/auth.decorators'
import { JoinDto, ListDonorsQuery, UpdateDonorDto } from './donors.dto'
import { DonorsService } from './donors.service'

@Controller('donors')
export class DonorsController {
  constructor(private readonly donors: DonorsService) {}

  /** Public donor sign-up. Limited per IP to slow down spam and number scraping. */
  @Public()
  @Throttle({ default: { limit: 10, ttl: 3_600_000 } })
  @Post()
  join(@Body() dto: JoinDto) {
    return this.donors.join(dto)
  }

  @Get()
  list(@CurrentHospital() h: AuthedHospital, @Query() q: ListDonorsQuery) {
    return this.donors.list(h, q)
  }

  // Declared before ':id' so "stats" is not read as an id.
  @Get('stats')
  stats() {
    return this.donors.stats()
  }

  @Get(':id')
  detail(@CurrentHospital() h: AuthedHospital, @Param('id', ParseIntPipe) id: number) {
    return this.donors.detail(h, id)
  }

  @Patch(':id')
  update(@CurrentHospital() h: AuthedHospital, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDonorDto) {
    return this.donors.update(h, id, dto)
  }
}
