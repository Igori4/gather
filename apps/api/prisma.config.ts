import { config } from 'dotenv'
import { resolve } from 'path'
import { defineConfig, env } from 'prisma/config'

const root = resolve(__dirname, '../..')
config({ path: resolve(root, '.env.local') })
config({ path: resolve(root, '.env') })

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
})
