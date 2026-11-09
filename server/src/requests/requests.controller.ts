import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common'
import { AuthedHospital, CurrentHospital } from '../common/auth.decorators'
import { CreateRequestDto, ListRequestsQuery, PreviewDto } from './requests.dto'
import { RequestsService } from './requests.service'

@Controller()
export class RequestsController {
  constructor(private readonly requests: RequestsService) {}

  @Get('stats/dashboard')
  dashboard(@CurrentHospital() h: AuthedHospital) {
    return this.requests.dashboard(h)
  }

  @Get('requests')
  list(@CurrentHospital() h: AuthedHospital, @Query() q: ListRequestsQuery) {
    return this.requests.list(h, q.status)
  }

  @HttpCode(200)
  @Post('requests/preview')
  preview(@CurrentHospital() h: AuthedHospital, @Body() dto: PreviewDto) {
    return this.requests.preview(h, dto)
  }

  @Post('requests')
  create(@CurrentHospital() h: AuthedHospital, @Body() dto: CreateRequestDto) {
    return this.requests.create(h, dto)
  }

  @Get('requests/:id')
  detail(@CurrentHospital() h: AuthedHospital, @Param('id', ParseIntPipe) id: number) {
    return this.requests.detail(h, id)
  }

  @Post('requests/:id/remind')
  remind(@CurrentHospital() h: AuthedHospital, @Param('id', ParseIntPipe) id: number) {
    return this.requests.remind(h, id)
  }

  @Post('requests/:id/expand')
  expand(@CurrentHospital() h: AuthedHospital, @Param('id', ParseIntPipe) id: number) {
    return this.requests.expand(h, id)
  }

  @Patch('requests/:id/fulfill')
  fulfill(@CurrentHospital() h: AuthedHospital, @Param('id', ParseIntPipe) id: number) {
    return this.requests.fulfill(h, id)
  }

  @Post('requests/:id/responses/:responseId/arrived')
  arrived(@CurrentHospital() h: AuthedHospital, @Param('id', ParseIntPipe) id: number, @Param('responseId', ParseIntPipe) responseId: number) {
    return this.requests.markArrived(h, id, responseId)
  }
}
