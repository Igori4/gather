# gather

## Feature Flags & A/B Testing

**Source of truth: the backend.** Flag/experiment _names_ live in
`packages/shared/src/flagNames.ts` (`FEATURE_FLAGS`, `EXPERIMENTS`) so neither
app hardcodes a magic string, but the _values_ — whether a flag is on, which
variants an experiment has — are defined once in
`apps/api/src/lib/flags.ts` and never duplicated on the frontend. The
frontend only ever asks the API "what's the value for X" — it never decides
a flag/variant locally.

### Variant assignment

`GET /api/experiments/:experimentName/variant` deterministically buckets the
caller into a variant using SHA-256 of `${experimentName}:${subjectId}`
(`apps/api/src/lib/hash.ts`), where `subjectId` is the JWT `userId` if logged
in, otherwise an anonymous id stored in an httpOnly cookie
(`apps/api/src/middleware/identity.ts`). Hashing was chosen over a numeric
modulo because ids are cuids/UUIDs (not numbers) and a crypto hash spreads
buckets evenly with no shared state.

The computed variant is persisted to `ExperimentAssignment`
(`userId`/`anonymousId`, `experimentName`, `variant`, `assignedAt`) the first
time a subject is seen, and read back on every subsequent call — so a
variant never "flips" if the hash bucket count or experiment definition
changes later, and a logged-out visitor who later logs in keeps whatever
variant they were already shown.

### Frontend consumption

- `FeatureFlagProvider` (`apps/web/src/lib/flags.tsx`) fetches `/api/flags`
  once via TanStack Query and exposes it through React Context.
- `useFeatureFlag(name)` reads a boolean flag from that context.
- `useABVariant(experimentName)` fetches/caches a single experiment's variant
  on demand and returns `{ variant, isLoading }`.
- **Flicker:** this is pure CSR, so there's no SSR-rendered "correct" first
  paint to fall back to. `main.tsx` prefetches `/api/flags` into the
  QueryClient _in parallel_ with the existing auth-refresh call (which
  already blocks first render) — so feature flags never have a loading
  state to flicker through, at effectively zero added latency. Per-experiment
  variants (`useABVariant`) are intentionally **not** prefetched the same
  way, since the set of experiments in use isn't known until a component
  asks — those have their own narrow, local loading state instead.

### Tracking & analytics

`POST /api/events` writes to the `Event` table (`type`, `experimentName`,
`variant`, `userId`/`anonymousId`, `payload`, `createdAt`) — no external
analytics SaaS. `trackExposure(experimentName, variant)`
(`apps/web/src/lib/analytics.ts`) fires `experiment_exposed` only once the
variant has resolved **and** the element is actually visible (via
`IntersectionObserver`, not on blind mount). `trackConversion(...)` fires
`experiment_converted` when the user completes the target action.

Conversion rate per variant (`apps/api/src/lib/conversionRate.ts`):

```ts
const rows = await prisma.event.groupBy({
  by: ['variant', 'type'],
  where: { experimentName, type: { in: ['experiment_exposed', 'experiment_converted'] } },
  _count: { _all: true },
})
// converted / exposed per variant
```

### Live examples in this codebase

- **Feature flag (on/off):** `compact-nav` toggles a compact top nav in
  `AppLayout.tsx`.
- **A/B test (with conversion tracking):** `register-cta` on
  `RegisterPage.tsx` — variant `a` renders "Create Account", variant `b`
  renders "Get Started Free"; exposure fires when the button scrolls into
  view, conversion fires on successful registration.
