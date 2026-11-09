import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsISO8601, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator'
import { BLOOD_TYPES } from '../common/blood'
import { CITY_NAMES } from '../common/geo'

export class CreateDriveDto {
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  title!: string

  /** Used to find donors nearby. */
  @IsIn(CITY_NAMES)
  city!: string

  /** Where exactly, for example "AUBMC main lobby, Building C". */
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  location!: string

  /** Date and time with a timezone, for example 2026-12-05T09:00:00+02:00. */
  @IsISO8601({ strict: true })
  startsAt!: string

  @IsISO8601({ strict: true })
  endsAt!: string

  /** Maximum donors. Once reached, further "I will come" replies are told the drive is full. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2000)
  capacity?: number

  @IsOptional()
  @IsString()
  @MaxLength(300)
  notes?: string
}

export class UpdateDriveDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  title?: string

  @IsOptional()
  @IsIn(CITY_NAMES)
  city?: string

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  location?: string

  @IsOptional()
  @IsISO8601({ strict: true })
  startsAt?: string

  @IsOptional()
  @IsISO8601({ strict: true })
  endsAt?: string

  /** null removes the limit. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2000)
  capacity?: number | null

  @IsOptional()
  @IsString()
  @MaxLength(300)
  notes?: string
}

export class ListDrivesQuery {
  @IsOptional()
  @IsIn(['upcoming', 'past', 'all'])
  when?: 'upcoming' | 'past' | 'all'
}

export class InviteDto {
  @IsIn([5, 10, 20, 30])
  radiusKm!: number

  /** Only these blood types. All types when left out. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsIn(BLOOD_TYPES, { each: true })
  bloodTypes?: string[]

  /** Only count who would be invited, send nothing. */
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean
}
