import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import cookieParser from 'cookie-parser'
import swaggerUi from 'swagger-ui-express'
import { createProxyMiddleware } from 'http-proxy-middleware'
// import { authRouter } from './routes/auth'
import { groupsRouter } from './routes/groups'
import { swaggerSpec } from './lib/swagger'

const AUTH_APP_URL = process.env.AUTH_APP_URL ?? 'http://localhost:4001'
if (process.env.NODE_ENV === 'production' && !process.env.AUTH_APP_URL) {
  console.error('[security] AUTH_APP_URL not set in production — auth proxy will target localhost:4001')
}

export const app = express()

// Security headers
app.use(helmet())

// CORS — restrict to known frontend origins
const allowedOrigins = ['http://localhost:5173', process.env.CORS_ORIGIN].filter(
  Boolean
) as string[]

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: true,
  })
)

// Proxy BEFORE body parsers — body stream must not be consumed before forwarding
app.use(
  createProxyMiddleware({
    target: AUTH_APP_URL,
    changeOrigin: true,
    pathFilter: ['/auth', '/profile'],
    on: {
      error: (err, _req, res) => {
        console.error('[proxy] Auth service error:', err)
        ;(res as import('express').Response).status(502).json({ error: 'Auth service unavailable' })
      },
    },
  })
)

// Body + cookie parsing (for all non-proxied routes)
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

// Auth rate limiting — disabled in test so 13+ requests don't get 429
if (process.env.NODE_ENV === 'production') {
  const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { error: 'Too many requests, please try again later.' },
  })
  app.use('/auth', authLimiter)
}

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Swagger UI — available at /docs
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))
app.get('/docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json')
  res.send(swaggerSpec)
})

// Routes
// app.use('/auth', authRouter)
app.use('/api/groups', groupsRouter)
// app.use('/api/outings', outingsRouter) — Phase 3

// 404
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// Error handler — log structured, never leak stack traces to client
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[error]', { message: err.message, stack: err.stack })
  // TODO PBI-10.1: Sentry.captureException(err)
  res.status(500).json({ error: 'Internal server error' })
})
