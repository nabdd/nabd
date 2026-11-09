import { Type } from 'class-transformer'
import { Equals, IsBoolean, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator'
import { BLOOD_TYPES } from '../common/blood'
import { CITY_NAMES } from '../common/geo'

export class JoinDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string

  @IsInt()
  @Min(18)
  @Max(65)
  age!: number

  @IsString()
  @MaxLength(25)
  phone!: string

  /** "unknown" means the donor does not know their type yet. */
  @IsIn([...BLOOD_TYPES, 'unknown'])
  bloodType!: string

  @IsIn(CITY_NAMES)
  city!: string

  @IsBoolean()
  smoker!: boolean

  @IsBoolean()
  donatedBefore!: boolean

  @Equals(true, { message: 'You must agree to receive WhatsApp alerts' })
  consent!: boolean
}

export class ListDonorsQuery {
  @IsOptional()
  @IsIn(BLOOD_TYPES)
  type?: string

  @IsOptional()
  @IsString()
  @MaxLength(60)
  q?: string

  @IsOptional()
  @IsIn(['now', 'all'])
  eligible?: 'now' | 'all'

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number
}

export class UpdateDonorDto {
  /** Set after the hospital typed the donor's blood, for example for donors who signed up as "Not sure". */
  @IsOptional()
  @IsIn(BLOOD_TYPES)
  bloodType?: string

  /** YYYY-MM-DD, for donations made outside Nabd. */
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'lastDonation must be a date like 2026-05-31' })
  lastDonation?: string
}
