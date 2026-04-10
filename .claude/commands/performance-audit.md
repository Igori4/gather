---
description: Use when investigating slow page loads, poor Lighthouse scores, bad Core Web Vitals (LCP, CLS, INP), large bundle sizes, or any web performance issue. Always use this skill when the user mentions performance, speed, loading time, Lighthouse, Web Vitals, bundle size, or says "the site feels slow" — even if they don't use the word "performance".
---

# Performance Audit

## Worker Identity (Required)

Every response under this skill must begin with:

- `Active agent: performance-auditor`
- `Purpose: audit <what is being investigated> for performance issues`
- `Scope: <which pages/routes/metrics are in scope / what is explicitly excluded>`

---

## Overview

Random "optimizations" without measurement waste time and can make things worse. The only way to know what's slow is to measure it.

**Core principle:** Measure → Identify → Fix → Verify. Never optimize without data.

---

## The Iron Law

```
NO FIXES WITHOUT MEASUREMENT FIRST
```

If you haven't run a performance measurement, you cannot propose fixes.

---

## Phase 1: Baseline Measurement

Establish what's actually slow and by how much before touching any code.

### Run Lighthouse

```bash
# CLI — most reliable (not affected by browser extensions)
npx lighthouse <URL> --output=json --output-path=./lighthouse-report.json --chrome-flags="--headless"
```

If a URL isn't available yet, use DevTools → Lighthouse tab on the local dev server.

**Record these metrics:**
- Performance score (0–100)
- LCP — Largest Contentful Paint (target: < 2.5s)
- CLS — Cumulative Layout Shift (target: < 0.1)
- INP — Interaction to Next Paint (target: < 200ms)
- TBT — Total Blocking Time (lab proxy for INP; target: < 200ms)
- FCP — First Contentful Paint (target: < 1.8s)

### Check Bundle Size

```bash
# Next.js
ANALYZE=true next build   # requires @next/bundle-analyzer configured

# Vite
npx vite-bundle-visualizer

# Generic — quick size check
ls -lh dist/assets/ || ls -lh .next/static/chunks/
```

### Check Network

DevTools → Network tab → disable cache → reload. Note:
- Total transfer size and request count
- Largest resources (images, JS chunks)
- Waterfall bottlenecks (long chains of sequential requests)

---

## Phase 2: Identify the Bottleneck

Categorize the primary issue based on what Lighthouse flagged. Most perf problems fall into one bucket:

| Symptom | Likely cause |
|---|---|
| High LCP | Unoptimized images, render-blocking JS/CSS, slow server response (TTFB) |
| High CLS | Images without dimensions, injected content above fold, font swap |
| High INP / TBT | Large JS bundles, long tasks on main thread, heavy event handlers |
| High FCP | Render-blocking resources, slow TTFB |
| Large bundle | Unused deps, no code splitting, full library imports |

Pick the **top 1–2 issues by measured impact**. Do not try to fix everything at once — it makes verification meaningless.

---

## Phase 3: Investigate the Specific Issue

### LCP — content not loading fast enough

```bash
# Find oversized images
find ./public -name "*.jpg" -o -name "*.png" | xargs ls -lh | sort -k5 -rh | head -20

# Find img tags missing explicit dimensions (causes CLS too)
grep -r "<img" src/ --include="*.tsx" --include="*.jsx" | grep -v "width\|height"

# Check if LCP image has fetchpriority
grep -r "fetchpriority\|priority" src/ --include="*.tsx" --include="*.jsx"
```

Common fixes:
- Convert images to WebP/AVIF
- Add `fetchpriority="high"` to the LCP element
- Use `next/image` (handles format, sizing, lazy loading automatically)
- Add explicit `width` and `height` to prevent layout shift
- Remove `loading="lazy"` from above-the-fold images

### High TBT / INP — JS blocking the main thread

```bash
# Check chunk sizes
ls -lh .next/static/chunks/ | sort -k5 -rh | head -10

# Find heavy imports that could be lazy-loaded
grep -r "^import" src/ --include="*.tsx" | grep -v "from 'react'" | head -30
```

Common fixes:
- Code-split with `React.lazy()` + `Suspense` for below-fold components
- Defer heavy third-party scripts (`<Script strategy="lazyOnload">` in Next.js)
- Move expensive computation to a Web Worker
- Break up long synchronous tasks with `scheduler.yield()` or `setTimeout`

### Large bundle

```bash
# Check for duplicate packages
npx @double-star/dedup-check   # or check package-lock.json manually

# Analyze what's large before adding a new dep
npx bundlephobia <package-name>
```

Common fixes:
- Import only what you use: `import { debounce } from 'lodash-es'` not `import _ from 'lodash'`
- Replace heavy libs with lighter alternatives (e.g., `date-fns` instead of `moment`)
- Enable tree-shaking: use ES module imports, not CommonJS
- Split vendor and app bundles in webpack/Vite config

### CLS — layout shifting

Common fixes:
- Add `width` and `height` to all `<img>` tags (browser reserves space before image loads)
- Reserve space for ads/embeds with `min-height` on the container
- Use `font-display: optional` or match fallback font metrics to avoid FOUT shift
- Avoid inserting content above existing content after page load

---

## Phase 4: Implement Fix

Keep the fix focused on the identified bottleneck. One change at a time — multiple simultaneous changes make it impossible to know what worked.

For multi-file or complex fixes — use the `feature-implementer` worker with the bottleneck finding as context.

---

## Phase 5: Verify Improvement

Re-run the exact same measurement from Phase 1:

```bash
npx lighthouse <URL> --output=json --output-path=./lighthouse-report-after.json --chrome-flags="--headless"
```

Compare before vs. after:
- Did the target metric improve?
- Did any other metric regress?
- Is the improvement meaningful? (> 10% for scores, > 200ms for time-based metrics)

If improvement is negligible — the bottleneck was elsewhere. Return to Phase 2 with the new data.

---

## Output Contract

A complete performance-audit session must produce:

- Baseline metrics recorded (LCP, CLS, INP, TBT, Performance score, bundle size)
- Primary bottleneck identified with evidence from measurement — not guessed
- Fix implemented targeting that specific bottleneck
- After metrics recorded and compared to baseline
- Clear statement: improvement achieved, or explanation of why it wasn't and what to investigate next

If a live URL isn't available — use DevTools data from local dev server. Do not skip measurement entirely.

---

## Red Flags — Stop and Measure

- "This is obviously the problem" → measure it first
- Proposing multiple fixes at once → one at a time
- "It should be faster now" without re-measuring → run Lighthouse again
- Optimizing bundle size without checking actual Web Vitals → size ≠ user experience

---

Worker compliance: followed performance-auditor format
