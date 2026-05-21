import 'dotenv/config'
import http from 'http'
import { app } from './app'
import { initSocket } from './socket'

const PORT = process.env.API_PORT ?? 4000

const server = http.createServer(app)
initSocket(server)

server.listen(PORT, () => {
  console.log(`[api] Server running on http://localhost:${PORT}`)
})
