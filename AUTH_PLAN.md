# Auth Microservice — Step-by-Step Plan

## Architecture

```
Web (5173) → Gather API (4000) → [proxy /auth /profile] → Auth App (4001) → Auth DB
                               → [local JWT validate]   → business logic → Gather DB
```

Shared `JWT_SECRET` — Gather API validates tokens locally, no network call per request.

---

## Steps

### Step 1 — Shared Schemas [ ]

File: `packages/shared/src/schemas/auth.ts`

- Add password strength rules to `RegisterSchema` (min 8, uppercase, lowercase, digit)
- Add `ActivateSchema` → `{ token: string }`
- Add `ChangeNameSchema` → `{ name: string }`
- Add `ChangePasswordSchema` → `{ currentPassword, newPassword, confirmPassword }` + refine passwords match
- Add `ChangeEmailRequestSchema` → `{ password, newEmail }`
- Update `ResetPasswordSchema` → add `confirmPassword` field + refine passwords match
- Export new types from `packages/shared/src/index.ts`

---

### Step 2 — Auth-App Project Scaffold [x]

File: `apps/auth-app/package.json`

- Package name: `@gather/auth-app` (`private: true`)
- `"main"` → `"dist/index.js"`, `"start"` → `"node dist/index.js"`
- Scripts: `dev`, `build`, `typecheck`, `format`, `test`, `db:generate`, `db:migrate` (aligned with `@gather/api` — no `mate-scripts`, `postinstall`, or `init`/`update` hooks)
- Runtime deps: `express bcrypt cookie-parser cors helmet jsonwebtoken resend zod @gather/shared @prisma/client @prisma/adapter-pg pg`
- Dev deps: `typescript ts-node nodemon prisma dotenv-cli jest ts-jest prettier` + `@types/*` for express/bcrypt/cookie-parser/cors/jsonwebtoken/node`
- **Lint:** use monorepo root `npm run lint` (`eslint.config.js` covers `apps/auth-app/src`) — no local `.eslintrc.js` or `@mate-academy/*` packages
- **Format:** workspace `npm run format` or root `npm run format` / `format:check`

New config files to create:

- `apps/auth-app/tsconfig.json` — strict, ES2022, outDir `dist/`, rootDir `src/`, path alias `@gather/shared → ../../packages/shared/src`
- `apps/auth-app/nodemon.json` — watch `src/`, exec `ts-node src/index.ts`
- `apps/auth-app/prisma.config.ts` — uses `AUTH_DATABASE_URL`
- `apps/auth-app/jest.config.ts` — ts-jest, moduleNameMapper for `@gather/shared`

Run `npm install` from monorepo root after updating `package.json`.

---

### Step 3 — Prisma Schema + Migrate [ ]

File: `apps/auth-app/prisma/schema.prisma`

Models:

- `User` — id (cuid), email (unique), passwordHash, name, isActive (default false), createdAt
- `RefreshToken` — id, userId, tokenHash, expiresAt, revoked
- `PasswordResetToken` — id, userId, tokenHash (unique), expiresAt, usedAt?
- `ActivationToken` — id, userId, tokenHash (unique), expiresAt, usedAt?
- `EmailChangeToken` — id, userId, newEmail, tokenHash (unique), expiresAt, usedAt?

Commands:

```bash
npm run db:generate --workspace=apps/auth-app
npm run db:migrate --workspace=apps/auth-app
```

Requires `AUTH_DATABASE_URL` in `.env.local` before running.

---

### Step 4 — Auth-App Lib Layer [ ]

Files to create:

- `apps/auth-app/src/lib/prisma.ts` — PrismaClient singleton using `AUTH_DATABASE_URL`
- `apps/auth-app/src/lib/jwt.ts` — copy from `apps/api/src/lib/jwt.ts` (same `JWT_SECRET` + `REFRESH_TOKEN_SECRET`)
- `apps/auth-app/src/lib/email.ts` — 4 functions:
  - `sendActivationEmail(email, token)` — dev: console.log link, prod: Resend
  - `sendPasswordResetEmail(email, token)` — same pattern
  - `sendEmailChangeConfirmation(newEmail, token)` — sends confirm link to new address
  - `sendEmailChangeNotification(oldEmail)` — notifies old address about change

---

### Step 5 — Auth-App Middleware [ ]

File: `apps/auth-app/src/middleware/auth.ts`

- `requireAuth` — reads `Authorization: Bearer <token>`, verifies JWT, attaches `userId` to request, returns 401 if missing/invalid
- `requireGuest` — if valid Bearer token present → 403 `Already authenticated`; invalid token = treat as guest, call next()

---

### Step 6 — Auth-App Routes [ ]

#### `apps/auth-app/src/routes/auth.ts`

| Method | Path                    | Middleware   | Behaviour                                                                                                                   |
| ------ | ----------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/auth/register`        | requireGuest | Create user (isActive=false), create ActivationToken (24h TTL), send activation email, return `201 { message }` — NO tokens |
| POST   | `/auth/activate`        | —            | Validate token, set isActive=true, mark token used, issue access+refresh tokens                                             |
| POST   | `/auth/login`           | requireGuest | Validate credentials; if `isActive === false` → `403 "Account not activated. Please check your email."`; else issue tokens  |
| POST   | `/auth/refresh`         | —            | Rotate refresh token, return new accessToken                                                                                |
| POST   | `/auth/logout`          | requireAuth  | Revoke all user's refresh tokens, clear cookie                                                                              |
| GET    | `/auth/me`              | requireAuth  | Return current user                                                                                                         |
| POST   | `/auth/forgot-password` | —            | Always 200; if email found create PasswordResetToken (1h TTL), send email                                                   |
| POST   | `/auth/reset-password`  | —            | Validate token, update password hash, revoke all refresh tokens                                                             |

#### `apps/auth-app/src/routes/profile.ts`

All routes use `requireAuth`.

| Method | Path                     | Behaviour                                                                                                   |
| ------ | ------------------------ | ----------------------------------------------------------------------------------------------------------- |
| PATCH  | `/profile`               | Update name (ChangeNameSchema)                                                                              |
| PATCH  | `/profile/password`      | Verify currentPassword with bcrypt, update hash (ChangePasswordSchema)                                      |
| PATCH  | `/profile/email`         | Verify password, create EmailChangeToken (1h TTL), send confirmation to newEmail + notification to oldEmail |
| POST   | `/profile/email/confirm` | Validate token, update user.email, mark token used                                                          |

---

### Step 7 — Auth-App app.ts + index.ts [ ]

Files:

- `apps/auth-app/src/app.ts` — Express app, middleware (helmet, cors, json, cookieParser), mount `/auth` and `/profile` routers, 404 handler, error handler
- `apps/auth-app/src/index.ts` — HTTP server on `PORT` (default 4001)

---

### Step 8 — Gather API Proxy [ ]

File: `apps/api/src/app.ts`

- Install `http-proxy-middleware@^3.0.0` in `apps/api`
- Comment out `authRouter` import and `app.use('/auth', authRouter)`
- Add proxy middleware for `['/auth', '/profile']` → `AUTH_APP_URL` (default `http://localhost:4001`)
- Add `AUTH_APP_URL` to env vars
- Delete `apps/api/tests/auth.test.ts` (tests move to auth-app)

---

### Step 9 — Web Changes [ ]

Files:

- **NEW** `apps/web/src/pages/auth/ActivatePage.tsx` — reads `?token=` from URL, calls `POST /auth/activate`, 3 states: loading / success (setUser + redirect to `/`) / error
- `apps/web/src/routes/authRoutes.tsx` — add `/activate` route **outside** `AuthLayout`
- `apps/web/src/api/auth.ts` — update `register()` return type to `{ message: string }`; add `activate()`, `changeName()`, `changePassword()`, `requestEmailChange()`
- `apps/web/src/pages/auth/RegisterPage.tsx` — show message after register instead of setUser/navigate
- `apps/web/src/pages/auth/ResetPasswordPage.tsx` — add `confirmPassword` field to form
- `apps/web/vite.config.ts` — add `/profile` to proxy pattern: `'^/(api|auth|profile)'`

---

### Step 10 — Auth-App Tests [ ]

File: `apps/auth-app/tests/auth.test.ts`

Cover: register, activate, login (active/inactive), refresh, logout, forgot-password, reset-password, profile routes.
Mock prisma, no real DB in tests.

---

### Step 11 — Environment Variables [ ]

Add to `.env` / `.env.local`:

```env
AUTH_DATABASE_URL=postgresql://.../<gather_auth_db>
AUTH_APP_URL=http://localhost:4001
FRONTEND_URL=http://localhost:5173
```

`JWT_SECRET` and `REFRESH_TOKEN_SECRET` already exist — do NOT duplicate.

---

### Step 12 — Monorepo Root Scripts [ ]

File: root `package.json`

```json
"dev:auth": "npm run dev --workspace=apps/auth-app"
```

Update `"dev"` to also start auth-app with `concurrently`.

---

## Verification Checklist

- [ ] `npm run typecheck --workspace=apps/auth-app` — 0 errors
- [ ] `npm run lint` (root) — auth-app `src/` included, no Mate Academy deps in lockfile
- [ ] `curl http://localhost:4001/health` → `{ "status": "ok" }`
- [ ] `curl http://localhost:4001/unknown` → 404
- [ ] Register → 201 `{ message }`, dev log shows activation link, no tokens
- [ ] Login before activate → 403 "Account not activated"
- [ ] Activate → 200 + accessToken issued
- [ ] Login after activate → 200 + refreshToken cookie
- [ ] Token from auth-app works on `GET http://localhost:4000/api/groups` → 200 (shared JWT_SECRET)
- [ ] `POST http://localhost:4000/auth/login` proxied → 200
- [ ] Web `/activate?token=<raw>` → success → redirect to `/`
- [ ] Password reset end-to-end through web
- [ ] `npm run test --workspace=apps/auth-app` — all pass
