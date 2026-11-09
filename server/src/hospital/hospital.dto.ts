import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'
import { CITY_NAMES } from '../common/geo'

export class UpdateHospitalDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string

  /** Used to measure distances to donors. */
  @IsOptional()
  @IsIn(CITY_NAMES)
  city?: string

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string

  /** Pre-filled on the new request form. */
  @IsOptional()
  @IsIn([5, 10, 20, 30])
  defaultRadiusKm?: number

  @IsOptional()
  @IsIn([30, 56])
  defaultMinDays?: number
}
