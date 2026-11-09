import { Type } from 'class-transformer'
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator'
import { BLOOD_TYPES, COMPONENTS, URGENCIES } from '../common/blood'

export class PreviewDto {
  @IsIn(BLOOD_TYPES)
  bloodType!: (typeof BLOOD_TYPES)[number]

  @IsBoolean()
  includeCompatible!: boolean

  @IsIn([5, 10, 20, 30])
  radiusKm!: number

  @IsIn([30, 56])
  minDays!: number
}

export class CreateRequestDto extends PreviewDto {
  @IsIn(COMPONENTS)
  component!: (typeof COMPONENTS)[number]

  @IsInt()
  @Min(1)
  @Max(20)
  units!: number

  @IsIn(URGENCIES)
  urgency!: (typeof URGENCIES)[number]

  @IsOptional()
  @IsString()
  @MaxLength(60)
  patientRef?: string

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string

  /** Send only to these donors. Ids that are not real matches are ignored. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(1000)
  @Type(() => Number)
  @IsInt({ each: true })
  donorIds?: number[]

  /** Send to every default match except these. Ignored when donorIds is given. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(1000)
  @Type(() => Number)
  @IsInt({ each: true })
  excludeDonorIds?: number[]
}

export class ListRequestsQuery {
  @IsOptional()
  @IsIn(['open', 'fulfilled', 'expired'])
  status?: 'open' | 'fulfilled' | 'expired'
}
