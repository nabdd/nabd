import { Controller, Get, Query, Res } from '@nestjs/common'
import { IsOptional, Matches } from 'class-validator'
import type { Response } from 'express'
import { AuthedHospital, CurrentHospital } from '../common/auth.decorators'
import { ReportsService } from './reports.service'

class RangeQuery {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'from must be a date like 2026-05-31' })
  from?: string

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'to must be a date like 2026-05-31' })
  to?: string
}

@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('summary')
  summary(@CurrentHospital() h: AuthedHospital, @Query() q: RangeQuery) {
    return this.reports.summary(h, q.from, q.to)
  }

  @Get('export.csv')
  export(@CurrentHospital() h: AuthedHospital, @Query() q: RangeQuery, @Res() res: Response) {
    const { filename, body } = this.reports.csv(h, q.from, q.to)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(body)
  }
}
