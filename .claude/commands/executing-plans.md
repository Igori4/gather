---
description: Use when you have a written implementation plan to execute in a separate session with review checkpoints
---

# Executing Plans

## Worker Identity (Required)

Every response under this skill must begin with:

- `Active agent: plan-executor`
- `Purpose: executing plan <filename> — tasks <range>`
- `Scope: <which tasks are in current batch / what is out of scope>`

---

## Overview

Load plan, review critically, execute tasks in batches, report for review between batches.

**Core principle:** Batch execution with checkpoints for architect review.

---

## The Process

### Step 1: Load and Review Plan

1. Read the plan file
2. Announce: "I'm using the executing-plans skill to implement this plan."
3. Review critically — classify any issues found:

**Critical gap** (stop and raise before starting):
- A required dependency or file does not exist
- An instruction contradicts another instruction
- The approach conflicts with existing architecture in a way the plan doesn't address
- A verification step is impossible as written

**Minor concern** (note it, proceed):
- Naming or style ambiguity that has a reasonable default
- A step that is more complex than anticipated but still actionable
- Missing context that can be inferred from existing code

4. If critical gaps exist: raise them before creating tasks
5. If no critical gaps: create TodoWrite list and proceed to Step 2

---

### Step 2: Execute Batch

**Batch size:** default 3 tasks, adjusted by complexity:
- Simple tasks (config changes, type fixes, straightforward additions) → up to 5
- Complex tasks (new subsystems, data flow changes, cross-cutting concerns) → 1–2
- Mixed → use judgment, keep batch reviewable in one sitting

For each task in the batch:
1. Mark as `in_progress`
2. Follow each step exactly — the plan has bite-sized steps for a reason
3. Run verifications as specified in the plan
4. Mark as `completed`

**Which agent to use per task type:**

| Task type | Agent to dispatch |
|---|---|
| Implementation step | `feature-implementer` |
| Writing or updating tests | `test-engineer` |
| Unfamiliar API or library | `api-researcher` before implementing |
| Code cleanup after implementation | `code-simplifier` |
| Verification / acceptance check | `acceptance-checker` |

For straightforward tasks — execute directly without dispatching a separate agent.
For complex or risky tasks — dispatch the appropriate agent with full task context from the plan.

---

### Step 3: Report

When batch is complete, report:
- What was implemented (one line per task)
- Which agents were dispatched and for which tasks
- Verification output for each task
- Any minor concerns encountered and how they were resolved
- Say: **"Ready for feedback."**

Then wait. Do not start the next batch until feedback is received.

---

### Step 4: Continue

Based on feedback:
- Apply requested changes if needed
- Execute next batch (return to Step 2)
- Repeat until all tasks complete

---

### Step 5: Complete Development

After all tasks are complete and verified:

1. Announce: "All tasks complete. Moving to finishing-a-development-branch skill."
2. **REQUIRED:** Use the `finishing-a-development-branch` skill
3. Follow that skill to verify tests, present options, execute choice

---

## When to Stop and Ask for Help

**STOP executing immediately when:**
- A blocker appears mid-batch (missing dependency, test fails, instruction unclear)
- A critical gap appears that wasn't visible during Step 1 review
- Verification fails more than once for the same task
- You are about to make a decision that affects code outside the plan's scope

**Ask for clarification rather than guessing.**

Do not continue the batch after hitting a blocker. Report what was completed, what blocked, and stop.

---

## When to Revisit Earlier Steps

**Return to Step 1 (Review) when:**
- Partner updates the plan based on your feedback
- Fundamental approach needs rethinking after a blocker

**Do not force through blockers.** Stop and ask.

---

## Branch Safety

**Never start implementation on `main` or `master` branch without explicit user consent.**

If current branch is `main`/`master` and the plan does not specify a branch:
- Stop before Step 2
- Ask which branch to use

---

## Output Contract

A complete plan execution session must produce per batch:

- Active agent header with task range
- List of completed tasks with one-line summaries
- Agents dispatched per task (or "executed directly" if no dispatch)
- Verification output for each completed task
- Any concerns raised and how they were handled
- Clear "Ready for feedback" signal at the end of each batch
- Final handoff to `finishing-a-development-branch` skill when all tasks done

If a batch is interrupted by a blocker — report completed tasks, state the blocker explicitly, stop.

---

## Integration

**Required workflow skills:**
- `writing-plans` — creates the plan this skill executes
- `finishing-a-development-branch` — completes development after all tasks

**Subagents should use:**
- `test-driven-development` — for TDD within each task that involves behavior changes

---

Worker compliance: followed plan-executor format