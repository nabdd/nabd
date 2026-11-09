import { randomBytes } from 'node:crypto'

export interface Env {
  NODE_ENV: 'development' | 'production' | 'test'
  PORT: number
  JWT_SECRET: string
  DATABASE_PATH: string
  CORS_ORIGIN: string
  SEED_DEMO: boolean
  WHATSAPP_PROVIDER: 'console' | 'cloud'
  WHATSAPP_TOKEN: string
  WHATSAPP_PHONE_NUMBER_ID: string
  WHATSAPP_VERIFY_TOKEN: string
  WHATSAPP_APP_SECRET: string
  WHATSAPP_TEMPLATE_URGENT: string
  WHATSAPP_TEMPLATE_VERIFY: string
  WHATSAPP_TEMPLATE_DRIVE: string
  /** Enables /api/admin when set. Sent as the X-Admin-Token header. */
  ADMIN_TOKEN: string
}

const str = (raw: Record<string, unknown>, key: string, fallback = '') => {
  const v = raw[key]
  return typeof v === 'string' && v.length > 0 ? v : fallback
}

/** Validates environment variables once at startup so misconfiguration fails fast. */
export function validateEnv(raw: Record<string, unknown>): Env {
  const nodeEnv = str(raw, 'NODE_ENV', 'development')
  if (!['development', 'production', 'test'].includes(nodeEnv)) throw new Error(`NODE_ENV must be development, production or test (got "${nodeEnv}")`)
  const production = nodeEnv === 'production'

  const port = Number(str(raw, 'PORT', '4000'))
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('PORT must be a valid port number')

  let secret = str(raw, 'JWT_SECRET')
  if (!secret) {
    if (production) throw new Error('JWT_SECRET is required in production')
    // Fixed so restarts (nest --watch) do not sign you out. Production refuses to start without a real secret.
    secret = nodeEnv === 'development' ? 'nabd-development-secret-not-for-production' : randomBytes(32).toString('hex')
    if (nodeEnv === 'development') console.warn('[config] JWT_SECRET not set: using an insecure development secret.')
  } else if (production && secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production')
  }

  const adminToken = str(raw, 'ADMIN_TOKEN')
  const minAdmin = production ? 32 : 12
  if (adminToken && adminToken.length < minAdmin) throw new Error(`ADMIN_TOKEN must be at least ${minAdmin} characters`)

  const provider = str(raw, 'WHATSAPP_PROVIDER', 'console')
  if (provider !== 'console' && provider !== 'cloud') throw new Error('WHATSAPP_PROVIDER must be "console" or "cloud"')
  const env: Env = {
    NODE_ENV: nodeEnv as Env['NODE_ENV'],
    PORT: port,
    JWT_SECRET: secret,
    DATABASE_PATH: str(raw, 'DATABASE_PATH', './data/nabd.db'),
    CORS_ORIGIN: str(raw, 'CORS_ORIGIN'),
    SEED_DEMO: str(raw, 'SEED_DEMO', production ? 'false' : 'true') === 'true',
    WHATSAPP_PROVIDER: provider,
    WHATSAPP_TOKEN: str(raw, 'WHATSAPP_TOKEN'),
    WHATSAPP_PHONE_NUMBER_ID: str(raw, 'WHATSAPP_PHONE_NUMBER_ID'),
    WHATSAPP_VERIFY_TOKEN: str(raw, 'WHATSAPP_VERIFY_TOKEN'),
    WHATSAPP_APP_SECRET: str(raw, 'WHATSAPP_APP_SECRET'),
    WHATSAPP_TEMPLATE_URGENT: str(raw, 'WHATSAPP_TEMPLATE_URGENT', 'blood_request_urgent_v2'),
    WHATSAPP_TEMPLATE_VERIFY: str(raw, 'WHATSAPP_TEMPLATE_VERIFY', 'donor_verify_v1'),
    WHATSAPP_TEMPLATE_DRIVE: str(raw, 'WHATSAPP_TEMPLATE_DRIVE', 'blood_drive_invite_v1'),
    ADMIN_TOKEN: adminToken,
  }
  if (provider === 'cloud') {
    for (const k of ['WHATSAPP_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_VERIFY_TOKEN', 'WHATSAPP_APP_SECRET'] as const) {
      if (!env[k]) throw new Error(`${k} is required when WHATSAPP_PROVIDER=cloud`)
    }
  }
  return env
}
