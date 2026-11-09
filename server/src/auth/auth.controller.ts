import { Body, Controller, Get, HttpCode, Patch, Post } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { AuthedHospital, CurrentHospital, Public } from '../common/auth.decorators'
import { AuthService } from './auth.service'
import { ChangePasswordDto, LoginDto } from './auth.dto'

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @HttpCode(200)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password)
  }

  @Get('me')
  me(@CurrentHospital() hospital: AuthedHospital) {
    return { hospital }
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Patch('password')
  changePassword(@CurrentHospital() h: AuthedHospital, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(h, dto.currentPassword, dto.newPassword)
  }
}
