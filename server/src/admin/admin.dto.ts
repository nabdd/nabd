import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'
import { CITY_NAMES } from '../common/geo'

export class CreateHospitalDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string

  @IsEmail()
  @MaxLength(200)
  email!: string

  @IsString()
  @MinLength(10, { message: 'The password needs at least 10 characters' })
  @MaxLength(200)
  password!: string

  @IsIn(CITY_NAMES)
  city!: string

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(10, { message: 'The password needs at least 10 characters' })
  @MaxLength(200)
  password!: string
}
