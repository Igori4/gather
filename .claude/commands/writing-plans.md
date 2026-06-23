---
description: Use when you have a spec or requirements for a multi-step task, before touching code
---

# Writing Plans

## Worker Identity (Required)

Every response under this skill must begin with:

- `Active agent: plan-writer`
- `Purpose: write implementation plan for <feature name>`
- `Scope: <which components are covered / what is explicitly deferred>`

---

## Overview

Write a comprehensive implementation plan assuming the engineer has zero context for the codebase and may not know good test design. Document everything they need: which files to touch, complete code, exact commands, expected output. Give the whole plan as bite-sized TDD tasks. DRY. YAGNI. Frequent commits.

**Announce at start:** "I'm using the writing-plans skill to create the implementation plan."

**Worktree check:** This should be run in a dedicated worktree created by the `brainstorming` skill. If no dedicated worktree exists — ask whether to create one before proceeding.

**Save plans to:** `docs/plans/YYYY-MM-DD-<feature-name>.md` (create `docs/plans/` if it doesn't exist)

---

## Bite-Sized Task Granularity

Each step is one action (2–5 minutes):

- "Write the failing test" — one step
- "Run it to verify it fails" — one step
- "Implement minimal code to pass" — one step
- "Run tests to verify pass" — one step
- "Commit" — one step

If a step takes longer than 5 minutes to describe — split it.

---

## Plan Document Header

Every plan must start with this header:

```markdown
# [Feature Name] Implementation Plan

**Goal:** [One sentence describing what this builds]
**Architecture:** [2–3 sentences about the approach]
**Tech Stack:** [Key technologies and libraries]
**Execution:** Use the `executing-plans` skill to implement this plan task-by-task.

---
```

---

## Task Structure

### Standard task (with TDD — use for all behavior changes):

````markdown
### Task N: [Component Name]

**Files:**

- Create: `exact/path/to/file.ts`
- Modify: `exact/path/to/existing.ts:123–145`
- Test: `tests/exact/path/to/test.ts`

**Step 1: Write the failing test**

```typescript
test('specific behavior description', () => {
  const result = function(input);
  expect(result).toBe(expected);
});
```
````

**Step 2: Run test — verify it fails**

```bash
npm test tests/path/test.ts -- --testNamePattern="specific behavior"
```

Expected: FAIL — "function is not defined" (or similar missing-feature message)

**Step 3: Write minimal implementation**

```typescript
function name(input: Type): ReturnType {
  return expected
}
```

**Step 4: Run test — verify it passes**

```bash
npm test tests/path/test.ts -- --testNamePattern="specific behavior"
```

Expected: PASS

**Step 5: Commit**

```bash
git add tests/path/test.ts src/path/file.ts
git commit -m "feat: add specific feature"
```

````

---

### Non-TDD task (use only for config, docs, migrations, scaffolding — no behavior to test):

```markdown
### Task N: [Component Name]

**Type:** non-TDD — [reason: config / docs / migration / scaffolding]

**Files:**
- Create/Modify: `exact/path/to/file`

**Step 1: [Action]**
[Complete content or exact command]

Expected output: [what success looks like]

**Step 2: Verify**
[How to confirm this step is correct — manual check, linter, or schema validation]

**Step 3: Commit**
```bash
git add exact/path/to/file
git commit -m "chore: [description]"
````

````

---

## Parallelization Notes

After listing all tasks, add a dependency map:

```markdown
## Task Dependencies

- Task 1: no dependencies
- Task 2: no dependencies
- Task 3: depends on Task 1
- Task 4: depends on Task 1 and Task 2
- Task 5: depends on Task 3 and Task 4

Independent groups (can run in parallel):
- Group A: Tasks 1, 2
- Group B: Tasks 3, 4 (after Group A)
- Group C: Task 5 (after Group B)
````

This map is used by `subagent-driven-development` and `dispatching-parallel-agents` skills to determine which tasks can run concurrently.

---

## Plan Requirements

- **Exact file paths always** — no vague "add to the service file"
- **Complete code in plan** — not "add validation here", write the actual code
- **Exact commands with expected output** — engineer should know what PASS looks like
- **Every behavior change has a TDD task** — use non-TDD only when explicitly justified
- **DRY, YAGNI** — no features not required by the spec

---

## Execution Handoff

After saving the plan file, announce the next step explicitly:

```
Selected worker agents: subagent-driven-development
Reason: plan is ready for task-by-task execution with per-task review
Current agent: subagent-driven-dev
```

Then proceed with the `subagent-driven-development` skill.

Use `dispatching-parallel-agents` for tasks identified as independent in the dependency map.

---

## Output Contract

A complete plan-writing session must produce:

- Plan file saved to `docs/plans/YYYY-MM-DD-<feature-name>.md`
- All tasks have exact file paths and complete code — no placeholders
- All behavior-change tasks use TDD structure
- Non-TDD tasks are explicitly justified
- Task dependency map included
- Execution handoff announced with correct worker routing

If the spec is ambiguous for any task — stop and ask before writing that task. Do not guess.

---

Worker compliance: followed plan-writer format
