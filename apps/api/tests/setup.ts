import dotenv from 'dotenv'
import path from 'path'

// Load root env files so DATABASE_URL etc. are available for integration tests
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') })
dotenv.config({ path: path.resolve(__dirname, '../../../.env') })

// Test-specific values — set only if not already provided by the environment
process.env.JWT_SECRET ??= 'test-jwt-secret-minimum-32-chars!!'
process.env.REFRESH_TOKEN_SECRET ??= 'test-refresh-secret-min-32-chars!'
process.env.JWT_EXPIRES_IN ??= '15m'
process.env.REFRESH_TOKEN_EXPIRES_IN ??= '7d'
process.env.NODE_ENV = 'test'
