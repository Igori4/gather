import fs from 'fs'
import path from 'path'
import { swaggerSpec } from '../src/lib/swagger'

const out = path.resolve(__dirname, '../swagger.json')
fs.writeFileSync(out, JSON.stringify(swaggerSpec, null, 2))
console.log(`✓ swagger.json written to ${out}`)
