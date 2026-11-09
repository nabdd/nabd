import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common'

export const IS_PUBLIC = 'isPublic'
/** Opts a route out of the global JWT guard. */
export const Public = () => SetMetadata(IS_PUBLIC, true)

export interface AuthedHospital {
  id: number
  name: string
  city: string
}

/** Injects the signed-in hospital resolved by the guard. */
export const CurrentHospital = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthedHospital => {
  return ctx.switchToHttp().getRequest().hospital
})
