---
description: Use when facing 3+ independent tasks that can be worked on without shared state or sequential dependencies
---

# Dispatching Parallel Agents

## Worker Identity (Required)

Every response under this skill must begin with:

- `Active agent: parallel-dispatcher`
- `Purpose: <one sentence describing what is being parallelized>`
- `Scope: <which domains are dispatched / what is explicitly excluded>`

---

## Overview

When you have multiple unrelated failures (different test files, different subsystems, different bugs), investigating them sequentially wastes time. Each investigation is independent and can happen in parallel.

**Core principle:** Dispatch one agent per independent problem domain. Let them work concurrently.

---

## When to Use

**Decision flow:**

```
Multiple failures?
├── no  → single agent handles it, do not dispatch
└── yes → Are they independent?
          ├── no (related, fixing one may fix others) → investigate together first
          └── yes → Can they work in parallel?
                    ├── no (shared state, same files) → sequential agents
                    └── yes → Parallel dispatch ✓
```

**Use when:**
- 3+ test files failing with different root causes
- Multiple subsystems broken independently
- Each problem can be understood without context from others
- No shared state between investigations

**Don't use when:**
- Failures are related (fix one might fix others)
- Need to understand full system state first
- Agents would edit the same files
- Exploratory debugging — you don't know what's broken yet

---

## Independence Heuristics

A domain is independent if **all** of the following are true:

- It has its own test file or subsystem boundary
- Its fix does not require understanding another domain's state
- Agents would not write to the same source files
- The failure message does not reference another failing module

If any condition fails — investigate together before dispatching.

---

## Which Agent to Dispatch

Match the problem domain to the correct agent:

| Problem type | Agent to dispatch |
|---|---|
| Test failures, bugs, unexpected behavior | `bug-repro-triager` → `feature-implementer` |
| Code quality, correctness review | `code-reviewer` |
| Unfamiliar API or library behavior | `api-researcher` |
| Algorithm or domain research | `research` |
| New implementation step | `feature-implementer` |
| Test coverage gaps | `test-engineer` |
| Code clarity and maintainability | `code-simplifier` |

Each dispatched agent must receive: specific scope, clear goal, constraints, and expected output format.

---

## The Pattern

### 1. Identify Independent Domains

Group failures by what's broken:
- File A tests: Tool approval flow
- File B tests: Batch completion behavior
- File C tests: Abort functionality

Each domain is independent — fixing tool approval doesn't affect abort tests.

### 2. Create Focused Agent Tasks

Each agent gets:
- **Specific scope:** One test file or subsystem
- **Clear goal:** Make these tests pass
- **Constraints:** Don't change other code
- **Expected output:** Summary of what you found and fixed

### 3. Dispatch in Parallel

```typescript
Agent("Fix agent-tool-abort.test.ts failures")
Agent("Fix batch-completion-behavior.test.ts failures")
Agent("Fix tool-approval-race-conditions.test.ts failures")
// All three run concurrently
```

### 4. Review and Integrate

When agents return:
- Read each summary
- Verify fixes don't conflict (see Conflict Resolution below)
- Run full test suite
- Integrate all changes

---

## Agent Prompt Structure

Good agent prompts are:
1. **Focused** — one clear problem domain
2. **Self-contained** — all context needed to understand the problem
3. **Specific about output** — what should the agent return?

```markdown
Fix the 3 failing tests in src/agents/agent-tool-abort.test.ts:

1. "should abort tool with partial output capture" - expects 'interrupted at' in message
2. "should handle mixed completed and aborted tools" - fast tool aborted instead of completed
3. "should properly track pendingToolCount" - expects 3 results but gets 0

These are timing/race condition issues. Your task:

1. Read the test file and understand what each test verifies
2. Identify root cause - timing issues or actual bugs?
3. Fix by:
   - Replacing arbitrary timeouts with event-based waiting
   - Fixing bugs in abort implementation if found
   - Adjusting test expectations if testing changed behavior

Do NOT just increase timeouts - find the real issue.
Do NOT change code outside this test file's scope.

Return: Summary of what you found and what you fixed.
```

---

## Common Mistakes

**❌ Too broad:** "Fix all the tests" — agent gets lost
**✅ Specific:** "Fix agent-tool-abort.test.ts" — focused scope

**❌ No context:** "Fix the race condition" — agent doesn't know where
**✅ Context:** Paste the error messages and test names

**❌ No constraints:** Agent might refactor everything
**✅ Constraints:** "Do NOT change production code" or "Fix tests only"

**❌ Vague output:** "Fix it" — you don't know what changed
**✅ Specific:** "Return summary of root cause and changes"

---

## Conflict Resolution

After agents return, check for conflicts before integrating:

**No conflict:** agents edited different files → integrate directly, run full suite.

**Conflict detected** (agents edited the same file or same function):
1. Do not auto-merge
2. Read both summaries to understand intent
3. Manually reconcile the overlapping changes
4. If reconciliation is unclear — re-run as sequential agents with the second agent reading the first agent's output

**Conflict prevention:** if two domains share a utility file, add to each agent prompt: `Do NOT modify <shared-file.ts>` — fix only the test-facing code.

---

## Verification

After agents return:

1. **Review each summary** — understand what changed and why
2. **Check for conflicts** — did agents edit the same files? (see Conflict Resolution)
3. **Run full suite** — verify all fixes work together
4. **Spot check** — agents can make systematic errors; read the actual diffs

---

## Real Example

**Scenario:** 6 test failures across 3 files after major refactoring

**Failures:**
- `agent-tool-abort.test.ts`: 3 failures (timing issues)
- `batch-completion-behavior.test.ts`: 2 failures (tools not executing)
- `tool-approval-race-conditions.test.ts`: 1 failure (execution count = 0)

**Independence check:** abort logic / batch completion / race conditions — separate subsystems, separate files ✓

**Dispatch:**
```
Agent 1 → bug-repro-triager: agent-tool-abort.test.ts
Agent 2 → bug-repro-triager: batch-completion-behavior.test.ts
Agent 3 → bug-repro-triager: tool-approval-race-conditions.test.ts
```

**Results:**
- Agent 1: Replaced timeouts with event-based waiting
- Agent 2: Fixed event structure bug (threadId in wrong place)
- Agent 3: Added wait for async tool execution to complete

**Integration:** all fixes independent, no conflicts, full suite green.

---

## Output Contract

A complete parallel-dispatch session must produce:

- List of dispatched agents with their scopes and agent types
- Summary from each agent: root cause + changes made
- Conflict check result (conflicts found / none)
- Full test suite result after integration
- Any domains excluded from parallelization and why

If an agent returns without a summary — re-prompt before integrating.

---

Worker compliance: followed parallel-dispatcher format