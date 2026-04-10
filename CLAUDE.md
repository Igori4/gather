# Gather — Claude Code Guide

## Project Overview

**Gather** is a social group outing planner. Users create groups, plan outings, vote on venues, RSVP, propose time slots, and get AI place suggestions.

## Monorepo Structure

```
gather/                          ← npm workspaces root
├── apps/
│   ├── api/                     ← @gather/api  — Express + Socket.IO backend (port 4000)
│   └── web/                     ← @gather/web  — React + Vite frontend (port 5173)
└── packages/
    └── shared/                  ← @gather/shared — Zod schemas shared by both apps
```

## Tech Stack

| Layer        | Technology                                                         |
|--------------|--------------------------------------------------------------------|
| Frontend     | React 18, Vite, React Router v6, TanStack Query v5, Zustand, Axios |
| Forms        | React Hook Form + `@hookform/resolvers` + Zod                     |
| Maps         | Mapbox GL                                                          |
| Charts       | Recharts                                                           |
| Real-time    | Socket.IO (client ↔ server)                                        |
| Backend      | Express 4, Helmet, CORS, express-rate-limit                        |
| ORM          | Prisma 5 (PostgreSQL via Supabase)                                 |
| Auth         | JWT (15m access / 7d refresh) + Google OAuth via Passport.js       |
| Email        | Resend                                                             |
| AI           | Google Gemini (`@google/generative-ai`)                            |
| Validation   | Zod (shared schemas in `packages/shared`)                          |
| Monitoring   | Sentry (frontend + backend, separate DSNs)                         |
| Deploy       | Frontend → Vercel, Backend → Railway                               |
| Node         | >=20.0.0                                                           |

## Common Commands

```bash
# Root — run both apps together
npm run dev

# Individual
npm run dev:web
npm run dev:api

# Lint / format / typecheck
npm run lint
npm run format
npm run typecheck

# Tests
npm run test                           # all workspaces
npm run test --workspace=apps/api      # API tests (Jest, --runInBand)
npm run test --workspace=apps/web      # Web tests (Vitest)

# API — database
npm run db:migrate --workspace=apps/api
npm run db:generate --workspace=apps/api
npm run db:seed --workspace=apps/api
npm run db:studio --workspace=apps/api
```

## Key Conventions

### Shared Schemas (`packages/shared`)
- All request/response shapes are defined as **Zod schemas** in `packages/shared/src/schemas/`
- Infer TypeScript types from schemas — never duplicate type definitions
- Both API route handlers and frontend forms consume the same schema for validation
- Files: `auth.ts`, `group.ts`, `outing.ts`, `chat.ts`, `ai.ts`
- Add new domain schemas here, export from `index.ts`

### API (`apps/api`)
- Entry: `src/index.ts` → creates HTTP server, mounts `app`, inits Socket.IO
- App config: `src/app.ts` — middleware, rate limiting, routes registered here
- Socket: `src/socket/index.ts` — `initSocket(server)` pattern
- DB: use the singleton `prisma` from `src/lib/prisma.ts` — never instantiate PrismaClient directly
- Routes follow pattern: `app.use('/auth', authRouter)`, `app.use('/api/groups', groupsRouter)`, etc.
- Rate limiting is already applied to `/auth` (10 req/min)
- Auth: JWT access token (15m) + refresh token (7d) via httpOnly cookies

### Frontend (`apps/web`)
- HTTP client: use `api` from `src/lib/axios.ts` — has silent 401→refresh interceptor built in
- Socket: use `getSocket()` / `connectSocket()` / `disconnectSocket()` from `src/lib/socket.ts`
- Auth state: `useAuthStore` from `src/stores/authStore.ts` (Zustand)
- Server state: TanStack Query for all API data fetching/mutations
- Forms: React Hook Form + Zod resolver using schemas from `@gather/shared`

### Testing
- **API**: Jest + Supertest, tests live in `apps/api/tests/`, match `**/*.test.ts`
  - Coverage threshold: 80% lines + branches
  - Uses `ts-jest`, maps `@gather/shared` to the local source
- **Web**: Vitest + Testing Library + MSW for mocking, setup in `src/tests/setup.ts`
- **E2E**: Playwright (`test:e2e`)

### Code Style
- TypeScript strict mode throughout
- ESLint + Prettier enforced via Husky pre-commit (lint-staged)
- No `any` — use Zod inference or explicit types
- Prefer named exports

## Domain Model (from Zod schemas)

| Entity       | Key fields / operations                                                              |
|--------------|--------------------------------------------------------------------------------------|
| User         | id, email, name, avatarUrl                                                           |
| Group        | name, description; roles: `admin` \| `member`                                        |
| Outing       | title, description; belongs to a Group                                               |
| Place        | placeId, name, address, lat, lng, mapboxUrl; voted `up` \| `down` per Outing         |
| RSVP         | status: `going` \| `maybe` \| `not_going`                                            |
| TimeSlot     | startsAt, endsAt (ISO datetime strings)                                              |
| ChatMessage  | body (1–2000 chars); supports send + edit                                            |
| AI Suggestion| 3 suggestions: name, category, whyItFits, estimatedCostRange, googleMapsLink         |

## Environment Variables

See `.env.example` at root. Required groups:
- **JWT**: `JWT_SECRET`, `JWT_EXPIRES_IN`, `REFRESH_TOKEN_SECRET`, `REFRESH_TOKEN_EXPIRES_IN`
- **DB**: `DATABASE_URL` (Supabase PostgreSQL)
- **Supabase**: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`
- **Google OAuth**: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`
- **Email**: `RESEND_API_KEY`, `EMAIL_FROM`
- **AI**: `GEMINI_API_KEY`
- **Frontend**: `VITE_API_URL`, `VITE_SOCKET_URL`, `VITE_MAPBOX_TOKEN`, `VITE_SENTRY_DSN`
- **Backend**: `SENTRY_DSN`, `CORS_ORIGIN`

## Current Implementation Status

The project is in early scaffolding phase:
- [x] Express app with security middleware, CORS, rate limiting
- [x] Socket.IO server scaffold
- [x] Shared Zod schemas for all domains
- [x] Axios client with silent token refresh
- [x] Socket client helpers
- [x] Zustand auth store
- [x] Prisma client singleton
- [ ] Prisma schema (`prisma/schema.prisma`)
- [ ] Route handlers: auth, groups, outings, chat, AI
- [ ] Frontend pages/components
- [ ] Socket event handlers (rooms, chat events)
