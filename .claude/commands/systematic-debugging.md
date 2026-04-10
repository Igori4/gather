---
description: Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes
---

# Systematic Debugging

## Worker Identity (Required)

Every response under this skill must begin with:

- `Active agent: systematic-debugger`
- `Purpose: find root cause of <issue description>`
- `Scope: <which component/test/system is in scope / what is explicitly excluded>`

---

## Overview

Random fixes waste time and create new bugs. Quick patches mask underlying issues.

**Core principle:** ALWAYS find root cause before attempting fixes. Symptom fixes are failure.

**Violating the letter of this process is violating the spirit of debugging.**

---

## The Iron Law

```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

If you have not completed Phase 1, you cannot propose fixes.

---

## When to Use

Use for ANY technical issue: test failures, bugs, unexpected behavior, performance problems, build failures, integration issues.

**Use this especially when:**
- Under time pressure — emergencies make guessing tempting
- "Just one quick fix" seems obvious
- You have already tried multiple fixes
- Previous fix did not work
- You do not fully understand the issue

**Do not skip when:**
- Issue seems simple — simple bugs have root causes too
- You are in a hurry — rushing guarantees rework

---

## Supporting Techniques — When to Use Each

Three techniques are defined at the end of this document. Apply them as follows:

| Technique | When to apply |
|---|---|
| **Root Cause Tracing** | Error is deep in call stack — trace backward to find originating trigger |
| **Defense-in-Depth Validation** | Fix found — add validation at every layer to make the bug structurally impossible |
| **Condition-Based Waiting** | Test is flaky due to timing — replace arbitrary `setTimeout` with condition polling |

---

## The Four Phases

Complete each phase before proceeding to the next.

---

### Phase 1: Root Cause Investigation

**Before attempting any fix:**

**1. Read Error Messages Carefully**
- Do not skip past errors or warnings — they often contain the exact solution
- Read stack traces completely
- Note line numbers, file paths, error codes

**2. Reproduce Consistently**
- Can you trigger it reliably?
- What are the exact steps?
- If not reproducible → gather more data, do not guess

**3. Check Recent Changes**
- What changed that could cause this?
- Git diff, recent commits, new dependencies, config changes, environmental differences

**4. Gather Evidence in Multi-Component Systems**

When the system has multiple components (CI → build → signing, API → service → database):

Add diagnostic instrumentation at each component boundary before proposing fixes:

```bash
# Layer 1: Workflow
echo "=== Secrets available in workflow: ==="
echo "IDENTITY: ${IDENTITY:+SET}${IDENTITY:-UNSET}"

# Layer 2: Build script
echo "=== Env vars in build script: ==="
env | grep IDENTITY || echo "IDENTITY not in environment"

# Layer 3: Signing script
echo "=== Keychain state: ==="
security list-keychains
security find-identity -v
```

Run once to gather evidence showing WHERE it breaks. Then analyze. Then investigate that specific component.

**5. Trace Data Flow**

When the error is deep in the call stack — use the Root Cause Tracing technique (defined below).

Quick version:
- Where does the bad value originate?
- What called this with the bad value?
- Keep tracing up until you find the source
- Fix at source, not at symptom

---

### Phase 2: Pattern Analysis

**Find the pattern before fixing:**

1. Find working examples — locate similar working code in the same codebase
2. Read reference implementations completely — do not skim, understand fully before applying
3. List every difference between working and broken, however small — do not assume "that can't matter"
4. Understand dependencies — what config, environment, or assumptions does the broken code require?

---

### Phase 3: Hypothesis and Testing

**Scientific method:**

1. **Form a single hypothesis** — state clearly: "I think X is the root cause because Y." Be specific.
2. **Test minimally** — make the smallest possible change to test the hypothesis. One variable at a time.
3. **Verify before continuing:**
   - Worked → Phase 4
   - Did not work → form a NEW hypothesis. Do not add more fixes on top.
4. **When you do not know** — say "I do not understand X." Do not pretend. Ask for help or research more.

---

### Phase 4: Implementation

**Fix the root cause, not the symptom:**

**1. Create a Failing Test Case First**
- Simplest possible reproduction
- Automated test if possible, one-off test script if no framework
- Must exist before implementing the fix
- Use the `test-driven-development` skill for writing proper failing tests

**2. Implement a Single Fix**
- Address the root cause identified
- One change at a time
- No "while I'm here" improvements
- No bundled refactoring

**Agent handoff (for complex fixes):**

| Fix complexity | Action |
|---|---|
| Simple — single file, obvious change | Implement directly |
| Complex — multiple files or cross-cutting | Dispatch `feature-implementer` with root cause finding and confirmed hypothesis as context |
| Complex test coverage needed | Dispatch `test-engineer` after fix is verified |

**3. Verify the Fix**
- Test passes?
- No other tests broken?
- Issue actually resolved?

**4. If Fix Does Not Work — Stop and Count**

| Attempts so far | Action |
|---|---|
| < 3 | Return to Phase 1, re-analyze with new information |
| ≥ 3 | Architectural problem — see below |

Do not attempt Fix #4 without completing the architectural check below.

---

### Architectural Check (After 3+ Failed Fixes)

**Signals indicating an architectural problem:**
- Each fix reveals new shared state, coupling, or problem in a different place
- Fixes require massive refactoring to implement
- Each fix creates new symptoms elsewhere

**Stop and prepare for discussion before attempting more fixes. Bring:**
- List of all fixes attempted and what each revealed
- The pattern of where new symptoms appeared
- A specific question: "Is this pattern fundamentally sound, or should we refactor the architecture?"

This is not a failed hypothesis — this is a wrong architecture. Systematic thrashing is the evidence.

---

## Red Flags — Stop and Follow Process

If you catch yourself thinking any of these — **stop and return to Phase 1:**

- "Quick fix for now, investigate later"
- "Just try changing X and see if it works"
- "Add multiple changes, run tests"
- "Skip the test, I'll manually verify"
- "It's probably X, let me fix that"
- "I don't fully understand but this might work"
- "Pattern says X but I'll adapt it differently"
- "Here are the main problems: [lists fixes without investigation]"
- Proposing solutions before tracing data flow
- "One more fix attempt" (when already tried 2+)
- Each fix reveals a new problem in a different place

---

## Signals You Are Doing It Wrong

Watch for these redirections from the project owner:

- "Is that not happening?" — you assumed without verifying
- "Will it show us...?" — you should have added evidence gathering
- "Stop guessing" — you are proposing fixes without understanding
- "Ultrathink this" — question fundamentals, not just symptoms
- "We're stuck?" (frustrated) — your approach is not working

When you see these: **stop, return to Phase 1.**

---

## Common Rationalizations

| Excuse | Reality |
|---|---|
| "Issue is simple, don't need process" | Simple issues have root causes too. Process is fast for simple bugs. |
| "Emergency, no time for process" | Systematic debugging is faster than guess-and-check thrashing. |
| "Just try this first, then investigate" | First fix sets the pattern. Do it right from the start. |
| "I'll write test after confirming fix works" | Untested fixes don't stick. Test first proves it. |
| "Multiple fixes at once saves time" | Can't isolate what worked. Causes new bugs. |
| "Reference too long, I'll adapt the pattern" | Partial understanding guarantees bugs. Read it completely. |
| "I see the problem, let me fix it" | Seeing symptoms ≠ understanding root cause. |
| "One more fix attempt" (after 2+ failures) | 3+ failures = architectural problem. Question the pattern, don't fix again. |

---

## Quick Reference

| Phase | Key Activities | Exit Criteria |
|---|---|---|
| **1. Root Cause** | Read errors, reproduce, check changes, gather evidence | Can state WHAT is wrong and WHY |
| **2. Pattern** | Find working examples, compare differences | Differences identified and understood |
| **3. Hypothesis** | Form single theory, test minimally | Hypothesis confirmed or replaced |
| **4. Implementation** | Create failing test, fix, verify | Test passes, no regressions |

---

## When Process Reveals No Root Cause

If systematic investigation reveals the issue is truly environmental, timing-dependent, or external:

1. You have completed the process — document what you investigated
2. Implement appropriate handling: retry, timeout, error message
3. Add monitoring or logging for future investigation

Note: 95% of "no root cause" cases are incomplete investigation.

---

## Output Contract

A complete systematic-debugging session must produce:

- Phase 1 complete: error read, reproduced, changes checked, evidence gathered
- Phase 2 complete: pattern found, differences identified
- Phase 3 complete: hypothesis stated explicitly before any fix attempted
- Phase 4 complete: failing test created, single fix implemented, verified
- If 3+ fixes failed: architectural check document prepared before next attempt
- Final state: bug resolved with passing test, or architectural discussion initiated

If any phase is blocked — stop, report the blocker, and wait. Do not skip phases.

---

---

# Supporting Technique: Root Cause Tracing

Bugs often manifest deep in the call stack. Fix where the error appears = treating a symptom.

**Core principle:** Trace backward through the call chain to find the original trigger, then fix at the source.

## The Tracing Process

**1. Observe the symptom**
```
Error: git init failed in /Users/jesse/project/packages/core
```

**2. Find the immediate cause**
```typescript
await execFileAsync('git', ['init'], { cwd: projectDir });
```

**3. Ask: what called this?**
```typescript
WorktreeManager.createSessionWorktree(projectDir, sessionId)
  → Session.initializeWorkspace()
  → Session.create()
  → test at Project.create()
```

**4. Keep tracing — what value was passed?**
- `projectDir = ''` (empty string!)
- Empty string as `cwd` resolves to `process.cwd()`
- That is the source code directory

**5. Find the original trigger**
```typescript
const context = setupCoreTest(); // Returns { tempDir: '' }
Project.create('name', context.tempDir); // Accessed before beforeEach!
```

## Adding Stack Traces

When you cannot trace manually, add instrumentation:

```typescript
async function gitInit(directory: string) {
  const stack = new Error().stack;
  console.error('DEBUG git init:', {
    directory,
    cwd: process.cwd(),
    nodeEnv: process.env.NODE_ENV,
    stack,
  });
  await execFileAsync('git', ['init'], { cwd: directory });
}
```

Use `console.error()` in tests — logger may not show output.

```bash
npm test 2>&1 | grep 'DEBUG git init'
```

**Never fix just where the error appears.** Trace back to the original trigger.

---

# Supporting Technique: Defense-in-Depth Validation

A single validation check can be bypassed by different code paths, refactoring, or mocks.

**Core principle:** Validate at every layer data passes through. Make the bug structurally impossible.

## The Four Layers

**Layer 1: Entry point**
```typescript
function createProject(name: string, workingDirectory: string) {
  if (!workingDirectory || workingDirectory.trim() === '') {
    throw new Error('workingDirectory cannot be empty');
  }
  if (!existsSync(workingDirectory)) {
    throw new Error(`workingDirectory does not exist: ${workingDirectory}`);
  }
}
```

**Layer 2: Business logic**
```typescript
function initializeWorkspace(projectDir: string, sessionId: string) {
  if (!projectDir) {
    throw new Error('projectDir required for workspace initialization');
  }
}
```

**Layer 3: Environment guard**
```typescript
async function gitInit(directory: string) {
  if (process.env.NODE_ENV === 'test') {
    const normalized = normalize(resolve(directory));
    const tmpDir = normalize(resolve(tmpdir()));
    if (!normalized.startsWith(tmpDir)) {
      throw new Error(`Refusing git init outside temp dir during tests: ${directory}`);
    }
  }
}
```

**Layer 4: Debug instrumentation**
```typescript
async function gitInit(directory: string) {
  logger.debug('About to git init', { directory, cwd: process.cwd(), stack: new Error().stack });
}
```

## Applying the Pattern

1. Trace the data flow — where does the bad value originate, where is it used?
2. Map all checkpoints — list every point data passes through
3. Add validation at each layer
4. Test each layer — try to bypass layer 1, verify layer 2 catches it

---

# Supporting Technique: Condition-Based Waiting

Flaky tests often guess at timing with arbitrary delays. This creates race conditions.

**Core principle:** Wait for the actual condition, not a guess about how long it takes.

## Core Pattern

```typescript
// ❌ Guessing at timing
await new Promise(r => setTimeout(r, 50));
const result = getResult();

// ✅ Waiting for condition
await waitFor(() => getResult() !== undefined);
const result = getResult();
```

## Quick Patterns

| Scenario | Pattern |
|---|---|
| Wait for event | `waitFor(() => events.find(e => e.type === 'DONE'))` |
| Wait for state | `waitFor(() => machine.state === 'ready')` |
| Wait for count | `waitFor(() => items.length >= 5)` |
| Wait for file | `waitFor(() => fs.existsSync(path))` |

## Implementation

```typescript
async function waitFor<T>(
  condition: () => T | undefined | null | false,
  description: string,
  timeoutMs = 5000
): Promise<T> {
  const startTime = Date.now();
  while (true) {
    const result = condition();
    if (result) return result;
    if (Date.now() - startTime > timeoutMs) {
      throw new Error(`Timeout waiting for ${description} after ${timeoutMs}ms`);
    }
    await new Promise(r => setTimeout(r, 10));
  }
}
```

## Common Mistakes

- **Polling too fast:** `setTimeout(check, 1)` wastes CPU → poll every 10ms
- **No timeout:** loop forever if condition never met → always include timeout with clear error message
- **Stale data:** caching state before loop → call getter inside loop for fresh data

## When Arbitrary Timeout Is Correct

```typescript
// Tool ticks every 100ms — need 2 ticks to verify partial output
await waitForEvent(manager, 'TOOL_STARTED');   // First: wait for condition
await new Promise(r => setTimeout(r, 200));    // Then: wait for timed behavior
// 200ms = 2 ticks at 100ms intervals — documented and justified
```

---

Worker compliance: followed systematic-debugger format