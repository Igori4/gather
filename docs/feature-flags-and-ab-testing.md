# Feature Flags & A/B Testing

**Date:** 2026-06-19
**Why:** Working example of feature flags and A/B testing to discuss, not just theory. Implemented as a self-contained system (no external SaaS) on top of Gather's existing stack (React/TanStack Query frontend, Express/Prisma/Postgres backend).

## What was built

### Database (`apps/api/prisma/schema.prisma`)

Two new models:

- `ExperimentAssignment` — `userId`/`anonymousId`, `experimentName`, `variant`, `assignedAt`. Stores which variant a subject was assigned to, so it never changes later even if the bucketing logic changes.
- `Event` — `type`, `experimentName`, `variant`, `userId`/`anonymousId`, `payload`, `createdAt`. Generic analytics event log (`experiment_exposed`, `experiment_converted`).

### Backend

| File                                       | Purpose                                                                                                                                                  |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/shared/src/flagNames.ts`         | Canonical flag/experiment name constants (`FEATURE_FLAGS`, `EXPERIMENTS`) shared by both apps — no magic strings on either side.                         |
| `apps/api/src/lib/flags.ts`                | Backend-owned registry of flag _values_ (enabled state) and experiment _definitions_ (variant list, description). Single source of truth.                |
| `apps/api/src/lib/hash.ts`                 | `hashToVariant(key, variants)` — deterministic SHA-256 bucketing.                                                                                        |
| `apps/api/src/lib/experimentAssignment.ts` | `assignVariant(experimentName, subject)` — looks up or creates the persisted `ExperimentAssignment` row.                                                 |
| `apps/api/src/lib/conversionRate.ts`       | Example Prisma `groupBy` query computing converted/exposed per variant.                                                                                  |
| `apps/api/src/middleware/identity.ts`      | Resolves `userId` from JWT if present, otherwise reads/creates an `httpOnly`, `SameSite=Strict` `gather_aid` cookie holding an anonymous id. Never 401s. |
| `apps/api/src/routes/flags.ts`             | `GET /api/flags`, `GET /api/experiments/:experimentName/variant`, `POST /api/events`.                                                                    |

**Why hashing instead of random assignment:** a cryptographic hash of `${experimentName}:${subjectId}` gives even bucket distribution without numeric ids and without any shared/coordinated state — the same subject always lands in the same bucket, computed independently on any request. The DB row exists purely to make that assignment durable (e.g. if the variant list or bucketing logic changes later, existing users keep their original variant).

**Why a cookie for anonymous users:** flags/experiments must also work for logged-out visitors (e.g. on the register page before an account exists). The cookie just gives a stable identifier across requests from the same browser — the actual variant lives in `ExperimentAssignment`, keyed by that id.

### Frontend (`apps/web`)

| File                            | Purpose                                                                                                                                                                                                     |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/lib/flags.tsx`    | `FeatureFlagProvider` (React Context, fetches `/api/flags` once via TanStack Query), `useFeatureFlag(name): boolean`, `useABVariant(name): { variant, isLoading }`.                                         |
| `apps/web/src/lib/analytics.ts` | `trackExposure(experimentName, variant)`, `trackConversion(experimentName, variant, payload?)` — POST to `/api/events`, fire-and-forget.                                                                    |
| `apps/web/src/main.tsx`         | Prefetches the flags query into the `QueryClient` in parallel with the existing auth-refresh call (which already blocks first render) — so flags are always already cached by the time the app tree mounts. |

**Flicker decision:** this app is pure CSR (no SSR), so there's no server-rendered "correct" first paint to fall back to. Two options exist: (a) block first render until flags resolve, or (b) render immediately with a default/skeleton and swap when data arrives. Chose (a), piggy-backed onto the auth-refresh call that already blocks first paint — this adds effectively zero extra latency (parallel request) and means flag consumers never need a loading branch. Per-experiment variants (`useABVariant`) deliberately do **not** use this approach, since the set of experiments in use isn't known ahead of time; those get a local, scoped loading state instead.

### Applied to real UI

- **Feature flag (on/off):** `compact-nav` on `apps/web/src/layouts/AppLayout.tsx` — toggles a compact, icon-only nav header.
- **A/B test (with conversion tracking):** `register-cta` on `apps/web/src/pages/auth/RegisterPage.tsx` — variant `a` renders "Create Account", variant `b` renders "Get Started Free". Exposure is tracked only once the button is actually visible (`IntersectionObserver`, not on blind mount); conversion is tracked on successful registration.

### Tests

- `apps/api/tests/lib/hash.test.ts` — determinism (same key → same variant, always) and rough uniformity over a 10,000-sample run, for both 2-way and 3-way variant splits.
- `apps/web/src/pages/auth/RegisterPage.test.tsx` — RTL + MSW component test asserting variant `a` renders "Create Account" and variant `b` renders "Get Started Free".

### Incidental fixes made along the way

- Port `5432` was bound by both a stray native/WSL Postgres process and the project's Docker Postgres container, causing intermittent auth failures. Remapped Docker's Postgres to host port `5433` (`docker-compose.yml`, `.env.local`) rather than touching the unidentified competing process.
- The Docker Postgres volume had a stale password from a previous setup — reset to match `.env.local` via `ALTER USER`.

## How to verify it works

```bash
docker compose up -d postgres
npm run dev:api
```

```bash
curl -i http://localhost:4000/api/flags
# {"flags":{"compact-nav":true}} + Set-Cookie: gather_aid=...

curl -s -c c.txt -b c.txt http://localhost:4000/api/experiments/register-cta/variant
curl -s -c c.txt -b c.txt http://localhost:4000/api/experiments/register-cta/variant
# same variant both times — assignment is persisted, not re-rolled

curl -o /dev/null -w "%{http_code}\n" http://localhost:4000/api/experiments/unknown/variant
# 404
```

`npm run db:studio --workspace=apps/api` to inspect `experiment_assignments` and `events` rows directly.

## Not yet done

- E2E test covering the full register → conversion flow (Playwright; tracked separately under PBI-9.4 in the main backlog).
- No targeting rules (e.g. % rollout, per-plan), no real-time flag updates without a page reload — out of scope for this learning exercise, but worth mentioning as the next step a production system (LaunchDarkly/Unleash-style) would add.
