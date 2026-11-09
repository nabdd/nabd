// Must be imported before the app so the config reads these values.
process.env.NODE_ENV = 'test'
process.env.DATABASE_PATH = ':memory:'
process.env.SEED_DEMO = 'true'
process.env.JWT_SECRET = 'test-secret-'.repeat(4)
process.env.WHATSAPP_PROVIDER = 'console'
process.env.WHATSAPP_APP_SECRET = 'test-app-secret'
process.env.WHATSAPP_VERIFY_TOKEN = 'verify-me'
process.env.ADMIN_TOKEN = 'test-admin-token-123'
