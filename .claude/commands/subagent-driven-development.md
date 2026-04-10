---
description: Use when executing implementation plans with independent tasks in the current session
---

# Subagent-Driven Development

## Worker Identity (Required)

Every response under this skill must begin with:

- `Active agent: subagent-driven-dev`
- `Purpose: execute plan <filename> using subagent-per-task with two-stage review`
- `Scope: <task range being executed / what is explicitly deferred>`

---

## Overview

Execute a plan by dispatching a fresh subagent per task, with two-stage review after each: spec compliance first, then code quality.

**Core principle:** Fresh subagent per task + two-stage review (spec → quality) = high quality, fast iteration.

---

## When to Use

**Use this skill when:**
- You have an implementation plan
- Tasks are mostly independent (no tight sequential coupling)
- You are staying in the current session

**Use `executing-plans` skill instead when:**
- Tasks must be executed in a parallel session
- Human review is required between every task (not just per batch)

**Use `brainstorming` skill first when:**
- No plan exists yet

---

## Branch Safety

**Never start implementation on `main` or `master` without explicit user consent.**

If no feature branch exists — stop before dispatching any subagent and ask which branch to use.

---

## Process (Per Task)

```
Read plan → extract all tasks upfront → create TodoWrite

For each task:
  1. Dispatch feature-implementer
     └─ subagent asks questions? → answer → re-dispatch
  2. feature-implementer implements, tests, commits, self-reviews, reports
  3. Dispatch spec compliance reviewer (inline prompt below)
     └─ issues found? → resume feature-implementer → re-review until ✅
  4. Dispatch code-reviewer via requesting-code-review skill ← only after spec is ✅
     └─ issues found? → resume feature-implementer → re-review until ✅
  5. Mark task complete in TodoWrite

After all tasks:
  Dispatch code-reviewer for entire implementation (final review template below)
  Use finishing-a-development-branch skill
```

**Rule:** never start code quality review before spec compliance is ✅. Wrong order wastes review cycles.

---

## Subagent Context Rule

When dispatching any subagent — provide full task text directly. Do not make subagents read the plan file themselves.

Context to include per task (include only what is relevant — do not dump everything):

| Context item | Include when |
|---|---|
| Where this task fits in the plan | always |
| What prior tasks produced | task builds on prior work |
| Architectural decisions already made | task touches existing patterns |
| Dependencies and constraints | task has explicit dependencies |
| Things to avoid | known pitfalls exist |

---

## Resuming a Subagent After Review Findings

When a reviewer finds issues — resume the `feature-implementer` with reviewer findings rather than dispatching a new one. Resuming preserves full implementation context.

**If the agent context was lost** — dispatch a fresh `feature-implementer` with:
- Original full task text
- All context from initial dispatch
- Reviewer findings appended as "Issues to fix before reporting back"

---

## Prompt Templates

### `feature-implementer` Subagent

```
You are the feature-implementer agent implementing Task N: [task name]

## Task Description

[FULL TEXT of task from plan — paste here, do not make subagent read file]

## Context

[Include only relevant items from the Context Rule above]
- Where this task fits: Task N of M, depends on Task X which added Y
- What was done in prior tasks: [files created, APIs added, patterns established]
- Architectural decisions: [e.g. "repository pattern", "all DB calls go through X"]
- Constraints: [things to avoid, existing conventions, tech choices already made]

## Before You Begin

If you have questions about requirements, approach, dependencies, or anything unclear —
ask them now before starting work.

## Your Job

Once clear on requirements:
1. Implement exactly what the task specifies
2. Write tests (follow TDD if task requires it)
3. Verify implementation works
4. Commit your work
5. Self-review (see below)
6. Report back

Work from: [directory]

While working: if you encounter something unexpected or unclear, ask. Do not guess.

## Self-Review Before Reporting

Review with fresh eyes:

**Completeness:**
- Did I implement everything in the spec?
- Did I miss any requirements?
- Are there unhandled edge cases?

**Quality:**
- Is this my best work?
- Are names clear and accurate?
- Is the code clean and maintainable?

**Discipline:**
- Did I avoid overbuilding (YAGNI)?
- Did I only build what was requested?
- Did I follow existing codebase patterns?

**Testing:**
- Do tests verify behavior (not just mock behavior)?
- Did I follow TDD if required?
- Are tests comprehensive?

Fix any self-review issues before reporting.

## Report Format

- What you implemented
- What you tested and test results
- Files changed
- Self-review findings (if any)
- Any issues or concerns
```

---

### Spec Compliance Reviewer

**Purpose:** verify `feature-implementer` built what was requested — nothing more, nothing less.

**Dispatch after `feature-implementer` reports. Before code quality review.**

```
You are reviewing whether an implementation matches its specification.

## What Was Requested

[FULL TEXT of task requirements]

## Your Job

Read the actual implementation code. Do not rely on the implementer's report.

Check for:

**Missing requirements:**
- Was everything requested actually implemented?
- Were any requirements skipped or missed?
- Did they claim something works but not implement it?

**Extra / unneeded work:**
- Did they build things not requested?
- Did they over-engineer or add unnecessary features?
- Did they add "nice to haves" not in spec?

**Misunderstandings:**
- Did they interpret requirements differently than intended?
- Did they solve the wrong problem?
- Did they implement the right feature the wrong way?

Verify by reading code, not by trusting the report.

## Output

✅ Spec compliant — everything matches after code inspection

or

❌ Issues found:
- [specific missing item — file:line]
- [specific extra item — file:line]
- [specific misunderstanding — file:line]
```

---

### Code Quality Reviewer

**Purpose:** verify implementation is well-built — clean, tested, maintainable.

**Only dispatch after spec compliance review is ✅.**

**Before dispatching — get SHAs:**
```bash
git log --oneline -10
```
- `BASE_SHA` = commit immediately before `feature-implementer`'s first commit for this task
- `HEAD_SHA` = latest commit after all implementer fixes

Use the `requesting-code-review` skill with the `code-reviewer` agent:
- `WHAT_WAS_IMPLEMENTED`: from implementer's report
- `PLAN_OR_REQUIREMENTS`: Task N from [plan-file]
- `BASE_SHA`: [commit before this task]
- `HEAD_SHA`: [current HEAD]
- `DESCRIPTION`: task summary

---

### Final Code Reviewer

**Dispatch the `code-reviewer` agent after all tasks are complete.**

```
You are the code-reviewer agent doing a final review of the complete implementation before merge.

## What Was Built

[Summary of all tasks completed — one line per task]

## Plan Reference

[path to plan file]

## Git Range

BASE_SHA: [SHA of commit before Task 1 began]
HEAD_SHA: [current HEAD]

```bash
git diff --stat {BASE_SHA}..{HEAD_SHA}
git diff {BASE_SHA}..{HEAD_SHA}
```

## Your Job

Review the full implementation for:
- All plan requirements met across all tasks
- No regressions introduced between tasks
- Consistent patterns and conventions across the full changeset
- Production readiness

Output format:
Strengths / Issues (Critical, Important, Minor) / Assessment (Ready to merge? Yes/No/With fixes)
```

---

## Example Workflow

```
[Read plan: docs/plans/feature-plan.md]
[Extract all 5 tasks with full text and context]
[Create TodoWrite with all 5 tasks]

--- Task 1: Hook installation script ---

[Dispatch feature-implementer with full Task 1 text + context]

feature-implementer: "Should hook be installed at user or system level?"
You: "User level (~/.config/superpowers/hooks/)"
[Re-dispatch feature-implementer with answer]

feature-implementer reports:
  - Implemented install-hook command
  - 5/5 tests passing
  - Self-review: missed --force flag, added it
  - Committed

[Dispatch spec compliance reviewer]
Spec reviewer: ✅ Spec compliant

[Get git SHAs, dispatch code-reviewer via requesting-code-review skill]
code-reviewer: No issues. Assessment: Ready to merge.

[Mark Task 1 complete in TodoWrite]

--- Task 2: Recovery modes ---

[Dispatch feature-implementer with full Task 2 text + context]

feature-implementer reports:
  - Added verify/repair modes
  - 8/8 tests passing
  - Committed

[Dispatch spec compliance reviewer]
Spec reviewer: ❌ Issues:
  - Missing: progress reporting (spec says "report every 100 items") — indexer.ts:130
  - Extra: --json flag added (not requested) — cli.ts:44

[Resume feature-implementer with reviewer findings]
feature-implementer: removed --json flag, added progress reporting

[Dispatch spec compliance reviewer again]
Spec reviewer: ✅ Spec compliant

[Get git SHAs, dispatch code-reviewer via requesting-code-review skill]
code-reviewer: Important: magic number (100) — indexer.ts:130

[Resume feature-implementer with quality findings]
feature-implementer: extracted PROGRESS_INTERVAL constant

[Dispatch code-reviewer again]
code-reviewer: ✅ Approved

[Mark Task 2 complete in TodoWrite]

... [Tasks 3–5] ...

[Dispatch code-reviewer for full implementation — final review template]
code-reviewer: All requirements met. Ready to merge.

[Use finishing-a-development-branch skill]
```

---

## Red Flags

**Never:**
- Start on main/master without explicit user consent
- Skip spec compliance review OR code quality review
- Start code quality review before spec compliance is ✅
- Proceed to next task while either review has open issues
- Make `feature-implementer` read the plan file — provide full text directly
- Accept "close enough" on spec compliance — issues found = not done
- Let implementer self-review replace the actual review stages

**If subagent asks questions:** answer completely before letting them proceed. Do not rush.

**If reviewer finds issues:** fix and re-review. Do not skip the re-review loop.

**If subagent fails:** dispatch a fresh `feature-implementer` with specific fix instructions. Do not fix manually — context pollution.

---

## Output Contract

A complete subagent-driven-dev session must produce:

- All tasks extracted upfront with full text and TodoWrite created
- Per task: `feature-implementer` report + spec compliance ✅ + `code-reviewer` ✅ + TodoWrite updated
- Any reviewer issues documented with file:line references
- Final `code-reviewer` review completed across full implementation
- Handoff to `finishing-a-development-branch` skill

If any task is blocked — stop, report the blocker, and wait. Do not skip to the next task.

---

## Integration

**Required workflow skills:**
- `writing-plans` — creates the plan this skill executes
- `requesting-code-review` — dispatches `code-reviewer` for quality review
- `finishing-a-development-branch` — completes development after all tasks

**Subagents should use:**
- `test-driven-development` — for TDD within each task

**Alternative workflow:**
- `executing-plans` — use for parallel session execution instead

---

Worker compliance: followed subagent-driven-dev format