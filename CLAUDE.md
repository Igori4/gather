# Gather — Claude Code Guide

## Project Overview

**Gather** is a social group outing planner. Users create groups, plan outings, vote on venues, RSVP, propose time slots, get AI place suggestions, and chat in real time.

Goal: portfolio-ready full-stack app demonstrating React depth, real-time, TanStack Query, JWT auth, AI integration, and testing.

## Monorepo Structure

```
gather/                          ← npm workspaces root
├── apps/
│   ├── api/                     ← @gather/api  — Express + Socket.IO (port 4000)
│   └── web/                     ← @gather/web  — React + Vite (port 5173)
└── packages/
    └── shared/                  ← @gather/shared — Zod schemas shared by both apps
```

## Tech Stack

| Layer      | Technology                                                             |
| ---------- | ---------------------------------------------------------------------- |
| Frontend   | React 18, Vite, React Router v6, TanStack Query v5, Zustand, Axios     |
| Forms      | React Hook Form + `@hookform/resolvers` + Zod                          |
| Maps       | Mapbox GL JS                                                           |
| Charts     | Recharts                                                               |
| Real-time  | Socket.IO (client ↔ server)                                            |
| Backend    | Express 4, Helmet, CORS, express-rate-limit, cookie-parser             |
| ORM        | Prisma 5 (PostgreSQL via Supabase)                                     |
| Auth       | JWT (15m access / 7d refresh) + Google OAuth via Passport.js           |
| Email      | Resend                                                                 |
| AI         | Google Gemini (`@google/generative-ai`, gemini-1.5-flash)              |
| Validation | Zod (shared schemas in `packages/shared`)                              |
| Monitoring | Sentry (frontend + backend, separate DSNs)                             |
| Deploy     | Frontend → AWS S3+CloudFront, Backend → AWS EC2+CloudFront (free tier) |
| Node       | >=20.0.0                                                               |

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

# Database (always scope to workspace)
npm run db:migrate --workspace=apps/api
npm run db:generate --workspace=apps/api
npm run db:seed --workspace=apps/api
npm run db:studio --workspace=apps/api
```

---

## Implementation Status & PBI Backlog

**Update this section as PBIs complete.** Mark `[x]` when done, add notes if scope changed.

### Epic 1 — Auth & Security

- [x] **PBI-1.1** Auth API — register, login, refresh, logout, `/me`, forgot/reset password → `apps/api/src/routes/auth.ts`
- [x] **PBI-1.2** Auth UI — LoginPage, RegisterPage, ForgotPasswordPage, ResetPasswordPage → `apps/web/src/pages/auth/`
- [x] **PBI-1.3** JWT + Zustand store + axios silent-refresh interceptor
- [ ] **PBI-1.4** Google OAuth — Passport.js strategy on API + OAuth button on login/register pages

### Epic 2 — Groups

- [x] **PBI-2.1** Groups API — create, list, get, invite by email, accept invitation → `apps/api/src/routes/groups.ts`
- [x] **PBI-2.2** Groups UI — GroupListPage (cards + create modal), GroupDetailPage (member list, roles) → `apps/web/src/pages/groups/`
- [x] **PBI-2.3** Group management — edit name/description/cover, remove member, leave group (admin-only guarded in API + UI)

### Epic 3 — Outing Planning Flow ← **core domain, start here after groups UI**

- [x] **PBI-3.1** Outings API — create outing, list for group, get detail → `apps/api/src/routes/outings.ts`
- [x] **PBI-3.2** Place search — Mapbox geocoding search + click-on-map (reverse geocoding), add/remove place to outing; `OutingMap` with blue/orange/purple markers, geolocation; `PlaceSearch` debounced dropdown → `apps/web/src/components/outings/`, `apps/api/src/routes/outings.ts`
- [x] **PBI-3.3** Place voting API — cast vote (up/down), toggle logic, get tally per place; `PlaceCard` vote buttons in `OutingDetailPage`
- [x] **PBI-3.4** Time slots API — propose slots, vote availability (upsert), delete slot; `ProposeSlotForm` (react-day-picker v10 + time inputs), live `AvailabilitySection` in `OutingDetailPage`; 124 tests passing
- [x] **PBI-3.5** Outing confirmation + RSVP API — admin confirms (place + slot), members RSVP; confirmed banner + RSVPBar + ConfirmModal in UI; 138 tests passing
- [x] **PBI-3.6** Outing detail UI — OutingDetailPage: place list + vote buttons, Mapbox map pins, time slot picker, RSVP bar, status indicator → `apps/web/src/pages/outings/OutingDetailPage.tsx`
- [x] **PBI-3.7** Outings list UI — OutingCard grid on GroupDetailPage, create outing modal

### Epic 4 — Real-Time (Socket.IO)

- [x] **PBI-4.1** Chat REST API — send (persists to DB), list messages (cursor pagination), edit/soft-delete own → `apps/api/src/routes/chat.ts`
- [x] **PBI-4.2** Socket.IO rooms — join/leave `outing:{id}` on mount/unmount, group membership auth guard → `apps/api/src/socket/`
- [x] **PBI-4.3** Live chat UI — `chat:message` + `chat:message:edited` events; ChatWindow + Message components; infinite scroll → `apps/web/src/components/chat/`; floating `ChatWidget` with unread counter → `apps/web/src/components/chat/ChatWidget.tsx`
- [ ] **PBI-4.4** Typing indicators — `chat:typing` broadcast, auto-clear 3s, TypingIndicator component
- [ ] **PBI-4.5** Live vote tallies — `vote:cast` + `slot:vote` events update UI without refetch
- [ ] **PBI-4.6** Live RSVP + outing confirm — `rsvp:updated` + `outing:confirmed` push to all room members
- [ ] **PBI-4.7** Presence indicators — `presence:join/leave`, avatar strip on outing page, unread badge on outing card
- [ ] **PBI-4.8** Chat resilience & error handling — fix 6 known gaps discovered 2026-07-07:
  1. **Re-join on reconnect** — `useChatRoom` must listen to `socket.on('connect')` and re-emit `outing:join` so user rejoins the room after any disconnect (currently misses all messages after reconnect)
  2. **Connection-state UI** — listen to `socket.on('disconnect')` / `socket.on('connect')` → show a banner/toast ("Reconnecting…" / "Back online") inside `ChatWindow`
  3. **Send error handling** — `Input.handleSubmit` has no `catch`; network/server errors are silently swallowed; add catch, show inline error, restore body text
  4. **Message gap recovery** — on reconnect, invalidate `['messages', outingId]` to refetch latest page and fill gap from disconnect window
  5. **Token refresh on socket auth failure** — intercept `connect_error` with reason "Invalid or expired token" → call refresh endpoint → `connectSocket(newToken)` (prevents silent socket death after 15-min JWT expiry)
  6. **`chat:message:edited` frontend listener** — `useChatRoom` only handles `chat:message`; add handler for `chat:message:edited` to update cached message body in-place

  Files: `apps/web/src/hooks/useChatRoom.ts`, `apps/web/src/components/chat/ChatWindow.tsx`, `apps/web/src/lib/socket.ts`

### Epic 5 — AI Suggestions (Gemini + Custom MCP)

Architecture: custom MCP server exposes Gather data as tools → Gemini agent calls them via function calling → multi-turn context instead of one-shot prompt stuffing.

**MCP server** lives at `packages/mcp/` — standalone Node process, speaks MCP protocol, connects to same Prisma DB.

**Tools exposed by MCP:**
| Tool | Description |
|------|-------------|
| `get_group_context(groupId)` | members count, name, past outings count |
| `get_outing_places(outingId)` | existing places (avoid duplicates in suggestions) |
| `get_past_outings(groupId, limit)` | categories/places visited — inform variety |
| `search_mapbox_places(query, proximity)` | Mapbox geocoding as a tool |

**Gemini uses function calling** (not MCP protocol natively) — MCP server exposes an HTTP adapter that translates tool calls to Gemini `functionDeclarations` format.

- [x] **PBI-5.1** MCP server scaffold — `packages/mcp/src/index.ts`, tool registry, types → `packages/mcp/`
- [x] **PBI-5.2** MCP tools implementation — `get_group_context`, `get_outing_places`, `get_past_outings`, `search_mapbox_places` with Zod-validated inputs/outputs
- [x] **PBI-5.3** Gemini agent service — 4-turn function calling loop, tool dispatch, Zod-validated final response, static fallback → `apps/api/src/lib/gemini.ts`
- [x] **PBI-5.4** AI suggestions API — `POST/GET /api/groups/:id/ai-suggestions` (5/day limit), store in DB, dismiss endpoint → `apps/api/src/routes/ai.ts`
- [x] **PBI-5.5** AI suggestions UI — "Get ideas" button, spinner, 3 suggestion cards (category, name, whyItFits, cost, Maps link, dismiss) → `apps/web/src/components/outings/AiSuggestions.tsx`
- [ ] **PBI-5.6** Weekly nudge cron — node-cron every Monday, inactive groups (14+ days), calls Gemini agent → sends Resend email with 2 suggestions → `apps/api/src/jobs/weeklyNudge.ts`

### Epic 6 — File Uploads (Supabase Storage)

- [ ] **PBI-6.1** Upload service — presigned URL flow, MIME whitelist (jpg/png/webp), 5 MB limit → `apps/api/src/routes/uploads.ts` + `apps/api/src/lib/supabase.ts`
- [ ] **PBI-6.2** Profile photo upload — avatar on UserProfilePage, URL saved to `users.avatar_url`
- [ ] **PBI-6.3** Group cover image — cover on group create/edit modal
- [ ] **PBI-6.4** Post-outing photos — upload on completed outing, stored in `outing_photos`, gallery view

### Epic 7 — History Feed & Stats

- [ ] **PBI-7.1** Outing history feed — completed outings list, photo gallery per outing → `apps/web/src/pages/outings/OutingHistoryPage.tsx`
- [ ] **PBI-7.2** Group stats — Recharts heatmap (outing frequency by month) + activity timeline on GroupDetailPage

### Epic 8 — Automated Emails

- [x] **PBI-8.1** Invite email via Resend — already in groups API
- [ ] **PBI-8.2** Reminder emails — 24h + 1h before confirmed outing; node-cron queries confirmed outings → `apps/api/src/jobs/reminderEmails.ts`

### Epic 9 — Testing

- [x] **PBI-9.1** Auth + groups API tests (Jest + Supertest) → `apps/api/tests/`
- [ ] **PBI-9.2** Outings/chat/AI/uploads API tests — route coverage to 80%
- [ ] **PBI-9.3** Frontend unit tests — Vitest + RTL for hooks (useAuth, useChatRoom, usePresence, useOuting) + key components
- [ ] **PBI-9.4** Playwright E2E — 4 scenarios: full flow, real-time (2 contexts), role guard, AI suggestions → `e2e/`

### Epic 10 — Production & Polish

- [ ] **PBI-10.1** Sentry — frontend DSN in Vite, backend DSN in Express error handler
- [ ] **PBI-10.2** Lighthouse audit — fix perf/a11y issues, reach score ≥85
- [x] **PBI-10.3** AWS deploy — S3+CloudFront (frontend), EC2+CloudFront reverse proxy (backend) → see `docs/DEPLOY_AWS.md`
- [ ] **PBI-10.4** README — one-command local setup, architecture diagram, feature walkthrough, cost table, badges

### Suggested implementation order

```
PBI-1.4 → PBI-2.2 → PBI-2.3 →
PBI-3.1 → PBI-3.2 → PBI-3.3 → PBI-3.4 → PBI-3.5 → PBI-3.6 → PBI-3.7 →
PBI-4.1 → PBI-4.2 → PBI-4.3 → PBI-4.8 → PBI-4.4 → PBI-4.5 → PBI-4.6 → PBI-4.7 →
PBI-8.2 →
PBI-5.1 → PBI-5.2 → PBI-5.3 → PBI-5.4 → PBI-5.5 → PBI-5.6 →
PBI-6.1 → PBI-6.2 → PBI-6.3 → PBI-6.4 →
PBI-7.1 → PBI-7.2 →
PBI-9.2 → PBI-9.3 → PBI-9.4 →
PBI-10.1 → PBI-10.2 → PBI-10.3 → PBI-10.4
```

---

## Conventions

### Shared Schemas (`packages/shared`)

- All request/response shapes → Zod schemas in `packages/shared/src/schemas/`
- Infer TS types from schemas — **never** duplicate type definitions
- Both API handlers and frontend forms consume the same schema
- Files: `auth.ts`, `group.ts`, `outing.ts`, `chat.ts`, `ai.ts` — export from `index.ts`
- Add new domain schemas here first, then import in both API and web

### API (`apps/api`)

**File layout:**

```
src/
├── routes/        ← thin routers, one per domain: auth.ts, groups.ts, flags.ts, outings.ts, chat.ts, ai.ts, uploads.ts
├── controllers/   ← request/response handlers: auth.controller.ts, groups.controller.ts, flags.controller.ts
├── repositories/  ← DB queries (Prisma abstractions): user.repository.ts, group.repository.ts, event.repository.ts
├── middleware/    ← auth.ts (JWT verify + requireAuth), identity.ts (anonymous identity)
├── socket/        ← index.ts (initSocket), chatHandler.ts, presenceHandler.ts, voteHandler.ts
├── jobs/          ← weeklyNudge.ts, reminderEmails.ts (node-cron)
├── lib/           ← prisma.ts, jwt.ts, email.ts, gemini.ts, supabase.ts, swagger.ts, flags.ts, hash.ts, experimentAssignment.ts, conversionRate.ts
└── generated/     ← Prisma generated client (do not edit)
```

**3-layer architecture:**

```
routes/ (OpenAPI docs + router) → controllers/ (req/res logic) → repositories/ (DB queries)
```

- Routes are thin — only route registration and OpenAPI JSDoc, no logic
- Controllers handle request parsing, validation, response — call repositories, never Prisma directly
- Repositories wrap Prisma — one file per domain model, named exports as object with methods

**Rules:**

- Singleton `prisma` from `src/lib/prisma.ts` — never instantiate PrismaClient directly
- Register routes in `src/app.ts`: `app.use('/api/outings', outingsRouter)` etc.
- Auth middleware: `requireAuth` from `src/middleware/auth.ts` — attaches `req.user` as `AuthRequest`
- Rate limiting already applied to `/auth` in production (10 req/min)
- Add OpenAPI JSDoc comments in the route file (Swagger at `/docs`)

**Adding a new route file:**

1. Create `src/repositories/<domain>.repository.ts` — DB logic only
2. Create `src/controllers/<domain>.controller.ts` — request handlers, import repository
3. Create `src/routes/<domain>.ts` — thin router, import controller functions
4. Register in `src/app.ts`: `app.use('/api/<domain>', domainRouter)`
5. Add API tests in `tests/<domain>.test.ts`

### Frontend (`apps/web`)

**File layout:**

```
src/
├── pages/
│   ├── auth/      ← Login, Register, ForgotPassword, ResetPassword
│   ├── groups/    ← GroupListPage, GroupDetailPage
│   ├── outings/   ← OutingDetailPage, OutingHistoryPage
│   └── profile/   ← UserProfilePage
├── components/
│   ├── ui/        ← shadcn/ui primitives (don't modify directly)
│   ├── groups/    ← GroupCard, MemberList, InviteModal
│   ├── outings/   ← OutingCard, PlaceVoteItem, TimeSlotPicker, RSVPBar
│   └── chat/      ← ChatWindow, Message, TypingIndicator
├── hooks/         ← useAuth, useChatRoom, usePresence, useOuting, useGroupMembers
├── stores/        ← authStore.ts (Zustand), uiStore.ts
├── lib/           ← axios.ts, socket.ts, queryClient.ts, utils.ts
└── routes/        ← authRoutes.tsx, groupRoutes.tsx (add new route files here)
```

**Rules:**

- HTTP client: `api` from `src/lib/axios.ts` — has silent 401→refresh interceptor, never use raw `fetch`
- Socket: `getSocket()` / `connectSocket()` / `disconnectSocket()` from `src/lib/socket.ts`
- Auth state: `useAuthStore` from `src/stores/authStore.ts` (Zustand)
- Server state: **TanStack Query** for all API data — queries in custom hooks under `src/hooks/`
- Forms: React Hook Form + `zodResolver` using schemas from `@gather/shared`
- Path alias `@/` maps to `src/` — use it everywhere

**Adding a new page:**

1. Create `src/pages/<domain>/<PageName>.tsx`
2. Add route to `src/routes/<domain>Routes.tsx`
3. Compose into `src/App.tsx` via the routes file

**TanStack Query pattern:**

```ts
// hooks/useOutings.ts
export function useOutings(groupId: string) {
  return useQuery({
    queryKey: ['outings', groupId],
    queryFn: () => api.get(`/api/groups/${groupId}/outings`).then(r => r.data),
  })
}

export function useCreateOuting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateOutingInput) => api.post('/api/outings', data).then(r => r.data),
    onSuccess: (_, vars) => queryClient.invalidateQueries({ queryKey: ['outings', vars.groupId] }),
  })
}
```

### Real-Time (Socket.IO)

**Room strategy:** one room per outing → `outing:{outingId}`. Join on page mount, leave on unmount.

**Auth guard:** every Socket event handler must verify the user is a member of the outing's group before processing.

**Event catalogue:**
| Event | Direction | Payload |
|-------|-----------|---------|
| `chat:message` | server → room | `{ id, outingId, userId, body, createdAt }` |
| `chat:typing` | client → server → room | `{ outingId, userId, isTyping }` |
| `chat:message:edited` | server → room | `{ messageId, newBody, editedAt }` |
| `rsvp:updated` | server → room | `{ outingId, userId, status }` |
| `vote:cast` | server → room | `{ outingId, placeId, userId, vote, tally }` |
| `slot:vote` | server → room | `{ slotId, userId, available, voteSummary }` |
| `outing:confirmed` | server → room | `{ outingId, placeId, slotId, confirmedAt }` |
| `presence:join` | server → room | `{ userId, name, avatarUrl }` |
| `presence:leave` | server → room | `{ userId }` |

**Client hook pattern:**

```ts
// hooks/useChatRoom.ts
useEffect(() => {
  const socket = getSocket()
  socket.emit('outing:join', { outingId })
  socket.on('chat:message', handleMessage)
  return () => {
    socket.off('chat:message', handleMessage)
    socket.emit('outing:leave', { outingId })
  }
}, [outingId])
```

### AI Suggestions (Gemini)

- Model: `gemini-1.5-flash` (free tier, 60 req/min)
- Always validate Gemini response with Zod — never trust raw LLM output
- Rate limit: max 5 AI requests per group per day (stored in DB or Redis)
- Fallback: if Gemini unavailable, return 3 static suggestions by category
- Sanitise all user input before inserting into prompts (prompt injection prevention)
- Schema in `packages/shared/src/schemas/ai.ts` — reuse `AiSuggestionSchema`

### File Uploads (Supabase Storage)

- Presigned URL flow: client requests upload URL from API → uploads directly to Supabase
- MIME whitelist: `image/jpeg`, `image/png`, `image/webp` only
- Size limit: 5 MB max
- Buckets: `avatars` (profile photos), `group-covers`, `outing-photos`

### Testing

**API (Jest + Supertest):**

- Tests in `apps/api/tests/`, pattern `**/*.test.ts`
- Coverage threshold: 80% lines + branches — enforced in CI
- Uses `ts-jest`, `@gather/shared` mapped to local source
- Every route must have tests — auth middleware tested separately
- Gemini client mocked — no real API calls in CI

**Web (Vitest + RTL):**

- Setup in `src/tests/setup.ts`
- API calls mocked with MSW (`src/tests/handlers.ts`)
- Test custom hooks, form validation, key components
- Coverage threshold: 80%

**E2E (Playwright):**

- Config: `apps/web/playwright.config.ts`
- 4 scenarios: full flow, real-time (2 contexts), role guard, AI suggestions
- Runs on PRs targeting `main` only

### Code Style

- TypeScript strict mode — no `any`, use Zod inference or explicit types
- ESLint + Prettier enforced via Husky pre-commit (lint-staged)
- Named exports preferred
- No comments unless the WHY is non-obvious
- No `console.log` in committed code — use proper error responses

---

## Domain Model (Prisma schema)

All models in `apps/api/prisma/schema.prisma`. IDs are cuid strings.

| Model                | Key fields                                                          | Notes                                                        |
| -------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------ |
| `User`               | id, email, passwordHash?, name, avatarUrl?, provider                | provider = `"local"` or `"google"`                           |
| `Group`              | id, name, description?, coverImageUrl?, createdBy                   |                                                              |
| `GroupMember`        | groupId+userId (PK), role, joinedAt                                 | role: `"admin"` \| `"member"`                                |
| `Outing`             | id, groupId, title, description?, status, createdBy, confirmedAt?   | status: `"draft"` \| `"voting"` \| `"confirmed"` \| `"done"` |
| `OutingPlace`        | id, outingId, placeId, name, address, lat, lng, mapboxUrl?, addedBy | unique(outingId, placeId)                                    |
| `PlaceVote`          | outingId+placeId+userId (PK), vote                                  | vote: `"up"` \| `"down"`                                     |
| `TimeSlot`           | id, outingId, proposedBy, startsAt, endsAt                          |                                                              |
| `TimeSlotVote`       | slotId+userId (PK), available (bool), votedAt                       |                                                              |
| `RSVP`               | outingId+userId (PK), status                                        | status: `"going"` \| `"maybe"` \| `"not_going"`              |
| `ChatMessage`        | id, outingId, userId, body, createdAt, editedAt?                    |                                                              |
| `AiSuggestion`       | id, groupId, payload (Json), generatedAt, dismissedAt?              | payload = array of suggestions                               |
| `OutingPhoto`        | id, outingId, userId, url, caption?, uploadedAt                     |                                                              |
| `Invitation`         | id, groupId, email, role, token (unique), expiresAt, acceptedAt?    |                                                              |
| `RefreshToken`       | id, userId, tokenHash, expiresAt, revoked                           |                                                              |
| `PasswordResetToken` | id, userId, tokenHash (unique), expiresAt, usedAt?                  |                                                              |

---

## Deployment (AWS, free tier)

Full step-by-step guide: `docs/DEPLOY_AWS.md`. Replaces the original Vercel/Railway
plan — chosen for $0/mo on AWS free tier (12 months from account creation).

**Architecture:**

```
Browser ──HTTPS──> CloudFront (frontend) ──> S3 (private, OAC)   [static React build]
Browser ──HTTPS/WSS──> CloudFront (backend proxy) ──> EC2:80 (Express + Socket.IO)
EC2 ──> Supabase Postgres (unchanged)
```

No custom domain or ACM cert needed — both CloudFront distributions get free
HTTPS on their own `*.cloudfront.net` domains, which is also what makes
WebSocket (Socket.IO) work without extra config.

**Live resources (AWS account 302290383528, region us-east-1):**

| Resource                         | ID / Address                                        |
| -------------------------------- | --------------------------------------------------- |
| Frontend URL                     | `https://d27ahufp1d5dg9.cloudfront.net`             |
| Backend URL                      | `https://d2e4rup9a7fq2s.cloudfront.net`             |
| Frontend CloudFront distribution | `ECJ4NU6ZENKC0`                                     |
| Backend CloudFront distribution  | `E7Y9AK78BI91K`                                     |
| S3 bucket (frontend)             | `gather-web-302290383528`                           |
| CloudFront OAC                   | `E3T9X6H9H01BL8`                                    |
| EC2 instance                     | `i-0eb4d1f1eb68ebe07` (54.82.100.254, t3.micro)     |
| EC2 security group               | `sg-0edfbd5523ac8b091` (SSH from one IP, HTTP open) |
| SSH key                          | `C:\Users\User\.ssh\gather-deploy-key.pem`          |
| IAM deploy user                  | `gather-deploy` (AdministratorAccess)               |

**Redeploy frontend:**

```bash
npm run build --workspace=apps/web
aws s3 sync apps/web/dist s3://gather-web-302290383528 --delete
aws cloudfront create-invalidation --distribution-id ECJ4NU6ZENKC0 --paths "/*"
```

`VITE_API_URL`/`VITE_SOCKET_URL` in `apps/web/.env.production` are baked in
at build time — editing that file alone does nothing until rebuilt.

**Redeploy backend:**

```bash
ssh -i ~/.ssh/gather-deploy-key.pem ubuntu@54.82.100.254 \
  "cd gather && git pull && sudo docker compose -f docker-compose.prod.yml up -d --build"
```

Secrets live in `.env.production` on the EC2 box itself (never committed).
`Dockerfile.prod` runs `prisma migrate deploy` on every container start.

**Known gotchas (already fixed in current `Dockerfile.prod`/`tsconfig.json`,
worth knowing if touching either):**

- `apps/api/tsconfig.json` `rootDir` is `../..` (not `./src`) — needed so
  `tsc` can compile `packages/shared` imports; compiled entrypoint lives at
  `dist/apps/api/src/index.js`, not `dist/index.js`.
- `node_modules/@gather/shared` is an npm-workspaces symlink whose
  `package.json` `main` points at TS source (fine for `ts-node` in dev,
  breaks plain `node` in prod) — the prod Docker image swaps it for the
  compiled output.
- `prisma.config.ts` lives next to `package.json`, not inside `prisma/` —
  must be explicitly copied into the runtime image or `prisma migrate
deploy` fails with "datasource.url required".
- Supabase free-tier projects auto-pause after ~1 week idle — looks like a
  credentials error (`FATAL: tenant/user not found`) but is fixed by
  clicking "Restore project" in the Supabase dashboard.
- EC2 `t3.micro` only has 1GB RAM — `npm install` during the Docker build
  gets OOM-killed without the 2GB swapfile already configured on the box.

---

## Environment Variables

See `.env.example` at root. **Never** hardcode secrets.

| Group        | Variables                                                                          |
| ------------ | ---------------------------------------------------------------------------------- |
| JWT          | `JWT_SECRET`, `JWT_EXPIRES_IN`, `REFRESH_TOKEN_SECRET`, `REFRESH_TOKEN_EXPIRES_IN` |
| DB           | `DATABASE_URL` (Supabase PostgreSQL connection string)                             |
| Supabase     | `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`                  |
| Google OAuth | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`                  |
| Email        | `RESEND_API_KEY`, `EMAIL_FROM`                                                     |
| AI           | `GEMINI_API_KEY`                                                                   |
| Frontend     | `VITE_API_URL`, `VITE_SOCKET_URL`, `VITE_MAPBOX_TOKEN`, `VITE_SENTRY_DSN`          |
| Backend      | `SENTRY_DSN`, `CORS_ORIGIN`, `NODE_ENV`                                            |

---

## Security Rules (enforce on every PR)

- Prisma parameterised queries — SQL injection impossible by default; never use `$queryRaw` with user input
- Helmet.js headers already applied in `src/app.ts`
- Rate limiting on `/auth` in production (10 req/min)
- CORS restricted to `localhost:5173` + `CORS_ORIGIN` env var only
- JWT access token stored in Zustand memory only — never `localStorage`
- Refresh token in `httpOnly` + `SameSite=Strict` cookie
- Socket.IO: verify group membership on **every** event handler before processing
- File uploads: enforce MIME whitelist + 5 MB limit server-side, not just client-side
- Invitation tokens: `crypto.randomBytes`, expire 7 days, single-use
- Gemini prompts: sanitise all user content before inserting into prompt strings

---

## API Route Patterns

All protected routes use `requireAuth` middleware from `src/middleware/auth.ts`.

```
POST   /auth/register
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout
GET    /auth/me                          ← requires authenticate
GET    /auth/google                      ← OAuth redirect
GET    /auth/google/callback

POST   /api/groups                       ← requires authenticate
GET    /api/groups                       ← requires authenticate
GET    /api/groups/:id                   ← requires authenticate + membership
POST   /api/groups/:id/invite            ← requires authenticate + admin role
DELETE /api/groups/:id/members/:userId   ← requires authenticate + admin role
POST   /api/groups/accept-invite

GET    /api/groups/:groupId/outings      ← requires authenticate + membership
POST   /api/outings                      ← requires authenticate
GET    /api/outings/:id                  ← requires authenticate + membership
POST   /api/outings/:id/places           ← requires authenticate + membership
DELETE /api/outings/:id/places/:placeId  ← requires authenticate + membership
POST   /api/outings/:id/places/:placeId/vote
POST   /api/outings/:id/slots            ← requires authenticate + membership
POST   /api/outings/:id/slots/:slotId/vote
POST   /api/outings/:id/confirm          ← requires authenticate + admin role
POST   /api/outings/:id/rsvp             ← requires authenticate + membership

GET    /api/outings/:id/messages         ← cursor pagination
POST   /api/outings/:id/messages         ← also emits socket event

POST   /api/groups/:id/ai-suggestions    ← requires authenticate + membership, 5/day limit
DELETE /api/ai-suggestions/:id           ← dismiss

POST   /api/uploads/presigned            ← returns Supabase presigned URL
```

---

## Outing Status Machine

```
draft → voting → confirmed → done
```

- `draft`: outing created, places being added
- `voting`: place voting open (auto or admin triggers)
- `confirmed`: admin confirmed place + time slot; triggers reminder email schedule
- `done`: outing date passed; photos can be uploaded

---

## Key Existing Files

| File                                            | Purpose                                           |
| ----------------------------------------------- | ------------------------------------------------- |
| `apps/api/src/app.ts`                           | Express app, all middleware, route registration   |
| `apps/api/src/index.ts`                         | HTTP server entry, Socket.IO init                 |
| `apps/api/src/routes/auth.ts`                   | Auth routes (thin, OpenAPI docs)                  |
| `apps/api/src/routes/groups.ts`                 | Groups routes (thin, OpenAPI docs)                |
| `apps/api/src/routes/flags.ts`                  | Feature flags + experiments routes                |
| `apps/api/src/controllers/auth.controller.ts`   | Auth request handlers                             |
| `apps/api/src/controllers/groups.controller.ts` | Groups request handlers                           |
| `apps/api/src/controllers/flags.controller.ts`  | Flags/experiments request handlers                |
| `apps/api/src/repositories/user.repository.ts`  | User + RefreshToken + PasswordResetToken DB ops   |
| `apps/api/src/repositories/group.repository.ts` | Group + GroupMember + Invitation DB ops           |
| `apps/api/src/repositories/event.repository.ts` | Analytics event tracking DB ops                   |
| `apps/api/src/middleware/auth.ts`               | `requireAuth` middleware — attaches `AuthRequest` |
| `apps/api/src/middleware/identity.ts`           | Anonymous identity tracking middleware            |
| `apps/api/src/lib/prisma.ts`                    | Prisma singleton                                  |
| `apps/api/src/lib/jwt.ts`                       | Token sign/verify helpers                         |
| `apps/api/src/lib/email.ts`                     | Resend email helper                               |
| `apps/api/src/lib/flags.ts`                     | Feature flag definitions + experiment names       |
| `apps/api/src/lib/hash.ts`                      | Hash utilities                                    |
| `apps/api/src/lib/experimentAssignment.ts`      | A/B variant assignment logic                      |
| `apps/api/src/lib/conversionRate.ts`            | Conversion rate tracking helpers                  |
| `apps/api/src/socket/index.ts`                  | Socket.IO init (skeleton — add handlers here)     |
| `apps/api/prisma/schema.prisma`                 | Full DB schema (13 models)                        |
| `apps/web/src/lib/axios.ts`                     | Axios instance with silent refresh                |
| `apps/web/src/lib/socket.ts`                    | Socket.IO client helpers                          |
| `apps/web/src/stores/authStore.ts`              | Zustand auth store                                |
| `apps/web/src/routes/authRoutes.tsx`            | Auth page routes                                  |
| `apps/web/src/routes/groupRoutes.tsx`           | App routes (extend this for new pages)            |
| `apps/web/src/pages/auth/LoginPage.tsx`         | Login form — reference for form pattern           |
| `packages/shared/src/schemas/`                  | All Zod schemas — start here for any new domain   |
