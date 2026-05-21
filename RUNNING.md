# Running Gather

## Prerequisites

- Node >= 20
- Docker Desktop (for Docker modes)
- `.env` at repo root (see `.env.example`)
- `.env.local` at repo root for local DB override (see below)

---

## Modes

### 1. Full stack — Docker (recommended)

Runs everything: Postgres, Mailpit, API, Web.

```powershell
docker compose up --build
```

| Service  | URL                   |
| -------- | --------------------- |
| Web      | http://localhost:5173 |
| API      | http://localhost:4000 |
| Mailpit  | http://localhost:8025 |
| Postgres | localhost:5432        |

**Hot reload:** file changes reflect automatically (polling enabled for Windows).

Stop:

```powershell
docker compose down
```

Stop + wipe DB volume:

```powershell
docker compose down -v
```

---

### 2. Full stack — Docker (infra only) + local Node

Run Postgres and Mailpit in Docker, API and Web on host. Faster restarts, native file watching.

```powershell
# Terminal 1 — infra
docker compose up postgres mailpit -d

# Terminal 2 — both apps
npm run dev

# Or separately:
# Terminal 2 — API
npm run dev:api

# Terminal 3 — Web
npm run dev:web
```

Requires `.env.local` with local DB URL (see **Database** section below).

---

### 3. API only

```powershell
npm run dev:api
```

---

### 4. Web only

```powershell
npm run dev:web
```

---

## Database

### Prisma Studio (visual DB browser)

```powershell
npm run db:studio --workspace=apps/api
```

Opens at http://localhost:5555.

Scripts auto-load `.env.local` first (local Docker DB), then `.env` for remaining vars.

### `.env.local` — local DB override

Create at repo root to point db scripts at local Docker Postgres:

```env
DATABASE_URL=postgresql://gather:gather_dev_password@localhost:5432/gather_dev
```

### Migrations

```powershell
npm run db:migrate --workspace=apps/api   # run + create migration
npm run db:generate --workspace=apps/api  # regenerate Prisma client after schema change
npm run db:seed --workspace=apps/api      # seed data
```

---

## Other Commands

```powershell
npm run lint          # ESLint all workspaces
npm run format        # Prettier write
npm run format:check  # Prettier check (CI)
npm run typecheck     # tsc --noEmit all workspaces
npm run test          # all workspace tests
npm run test --workspace=apps/api   # API tests only (Jest)
npm run test --workspace=apps/web   # Web tests only (Vitest)
```

---

## Ports Reference

| Service       | Port |
| ------------- | ---- |
| Web (Vite)    | 5173 |
| API (Express) | 4000 |
| Postgres      | 5432 |
| Mailpit SMTP  | 1025 |
| Mailpit UI    | 8025 |
| Prisma Studio | 5555 |
