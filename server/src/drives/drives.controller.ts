import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common'
import { AuthedHospital, CurrentHospital } from '../common/auth.decorators'
import { CreateDriveDto, InviteDto, ListDrivesQuery, UpdateDriveDto } from './drives.dto'
import { DrivesService } from './drives.service'

@Controller('drives')
export class DrivesController {
  constructor(private readonly drives: DrivesService) {}

  @Get()
  list(@CurrentHospital() h: AuthedHospital, @Query() q: ListDrivesQuery) {
    return this.drives.list(h, q.when)
  }

  @Post()
  create(@CurrentHospital() h: AuthedHospital, @Body() dto: CreateDriveDto) {
    return this.drives.create(h, dto)
  }

  @Get(':id')
  detail(@CurrentHospital() h: AuthedHospital, @Param('id', ParseIntPipe) id: number) {
    return this.drives.detail(h, id)
  }

  @Patch(':id')
  update(@CurrentHospital() h: AuthedHospital, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDriveDto) {
    return this.drives.update(h, id, dto)
  }

  /** Cancels the drive. It stays in the list as cancelled. */
  @Delete(':id')
  cancel(@CurrentHospital() h: AuthedHospital, @Param('id', ParseIntPipe) id: number) {
    return this.drives.cancel(h, id)
  }

  @HttpCode(200)
  @Post(':id/invite')
  invite(@CurrentHospital() h: AuthedHospital, @Param('id', ParseIntPipe) id: number, @Body() dto: InviteDto) {
    return this.drives.invite(h, id, dto)
  }
}
