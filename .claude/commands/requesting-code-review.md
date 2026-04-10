---
description: Use when completing tasks, implementing major features, or before merging to verify work meets requirements
---

# Requesting Code Review

## Worker Identity (Required)

Every response under this skill must begin with:

- `Active agent: code-review-requester`
- `Purpose: dispatch code review for <what was implemented>`
- `Scope: <git range being reviewed / what is explicitly excluded>`

---

## Overview

Dispatch the `code-reviewer` agent to catch issues before they cascade.

**Core principle:** Review early, review often.

---

## When to Request Review

**Mandatory:**
- After each task in subagent-driven development
- After completing a major feature
- Before merge to main

**Optional but valuable:**
- When stuck — fresh perspective
- Before refactoring — baseline check
- After fixing a complex bug

---

## How to Request

### Step 1: Get Git Range

```bash
# Head is always current
HEAD_SHA=$(git rev-parse HEAD)

# Base — prefer explicit over grep
BASE_SHA=$(git rev-parse HEAD~1)          # previous commit
# or
BASE_SHA=$(git rev-parse origin/main)     # divergence from main
```

**Avoid** `git log | grep "Task name"` — fragile if commit message differs even slightly. Use `HEAD~N` or branch divergence point instead.

### Step 2: Dispatch the `code-reviewer` Agent

Fill all placeholders before dispatching. Do not leave any placeholder empty:

| Placeholder | Source |
|---|---|
| `{WHAT_WAS_IMPLEMENTED}` | what you just built — one sentence |
| `{PLAN_OR_REQUIREMENTS}` | path to plan file, or inline requirements |
| `{BASE_SHA}` | from Step 1 |
| `{HEAD_SHA}` | from Step 1 |
| `{DESCRIPTION}` | brief summary of changes — 1–3 bullets from `git log --oneline {BASE_SHA}..{HEAD_SHA}` |

Use the **Code Reviewer Agent Template** section below as the prompt for the `code-reviewer` agent.

### Step 3: Act on Feedback

| Severity | Action |
|---|---|
| **Critical** | Fix immediately before any other work |
| **Important** | Fix before proceeding to the next task or batch |
| **Minor** | Log for later — do not block progress |

For pushback on reviewer findings — use the `receiving-code-review` skill.

---

## Integration with Workflows

**Subagent-Driven Development:** review after each task — catch issues before they compound, fix before moving to next task.

**Executing Plans:** review after each batch — get feedback, apply, continue.

**Ad-Hoc Development:** review before merge or when stuck.

---

## Red Flags

**Never:**
- Skip review because "it's simple"
- Ignore Critical issues
- Proceed past next task with unfixed Important issues
- Leave any placeholder empty in the template

---

## Output Contract

A complete code-review-request session must produce:

- Git range confirmed (BASE_SHA and HEAD_SHA both resolved)
- All template placeholders populated — none left as `{placeholder}`
- `code-reviewer` agent dispatched and response received
- Action taken per severity: Critical fixed / Important fixed / Minor logged
- Clear statement of next step after review is applied

---

## Example

```
[Just completed Task 2: Add verification function]

BASE_SHA=$(git rev-parse HEAD~1)
HEAD_SHA=$(git rev-parse HEAD)

[Dispatch code-reviewer agent with template below]
  WHAT_WAS_IMPLEMENTED: Verification and repair functions for conversation index
  PLAN_OR_REQUIREMENTS: docs/plans/deployment-plan.md — Task 2
  BASE_SHA: a7981ec
  HEAD_SHA: 3df7661
  DESCRIPTION:
    - Added verifyIndex() with 4 issue type checks
    - Added repairIndex() with rollback on failure

[code-reviewer agent returns]:
  Strengths: Clean architecture, real tests
  Issues:
    Important: Missing progress indicators
    Minor: Magic number (100) for reporting interval
  Assessment: Ready to proceed with fixes

[Fix progress indicators]
[Continue to Task 3]
```

---

# Code Reviewer Agent Template

---

You are the `code-reviewer` agent. Review code changes for production readiness. Be specific, be honest, give a clear verdict.

## What Was Implemented

{WHAT_WAS_IMPLEMENTED}

{DESCRIPTION}

## Requirements / Plan

{PLAN_OR_REQUIREMENTS}

## Git Range to Review

**Base:** {BASE_SHA}
**Head:** {HEAD_SHA}

```bash
git diff --stat {BASE_SHA}..{HEAD_SHA}
git diff {BASE_SHA}..{HEAD_SHA}
```

Read the full diff before forming any opinion. Do not review code you have not seen.

---

## Review Checklist

**Code Quality:**
- [ ] Clean separation of concerns?
- [ ] Proper error handling?
- [ ] Type safety (if applicable)?
- [ ] DRY principle followed?
- [ ] Edge cases handled?

**Architecture:**
- [ ] Sound design decisions?
- [ ] Scalability considerations?
- [ ] Performance implications?
- [ ] Security concerns?

**Testing:**
- [ ] Tests actually test logic (not just mocks)?
- [ ] Edge cases covered?
- [ ] Integration tests where needed?
- [ ] All tests passing?

**Requirements:**
- [ ] All plan requirements met?
- [ ] Implementation matches spec?
- [ ] No scope creep?
- [ ] Breaking changes documented?

**Production Readiness:**
- [ ] Migration strategy if schema changes?
- [ ] Backward compatibility considered?
- [ ] Documentation complete?
- [ ] No obvious bugs?

---

## Severity Guide

Use this to categorize — do not escalate severity for emphasis:

| Severity | Definition |
|---|---|
| **Critical** | Bugs, security issues, data loss risk, broken functionality — blocks merge |
| **Important** | Architecture problems, missing required features, poor error handling, test gaps — fix before next task |
| **Minor** | Code style, optimization opportunities, documentation improvements — non-blocking |

---

## Output Format

### Strengths
What is well done — be specific with file:line references.

### Issues

#### Critical (Must Fix Before Merge)
#### Important (Fix Before Next Task)
#### Minor (Non-Blocking)

**For each issue:**
- `File:line` — what is wrong
- Why it matters
- How to fix (if not obvious)

### Recommendations
Improvements for code quality, architecture, or process that do not fit the above categories.

### Assessment

**Ready to merge?** Yes / No / With fixes

**Reasoning:** technical assessment in 1–2 sentences.

---

## Rules

**Do:**
- Read the full diff before reviewing
- Categorize by actual severity — not everything is Critical
- Be specific: file:line, not vague descriptions
- Explain why each issue matters
- Acknowledge strengths
- Give a clear verdict

**Do not:**
- Say "looks good" without checking every checklist item
- Mark nitpicks as Critical
- Give feedback on code you did not read
- Be vague: "improve error handling" without location and fix
- Avoid giving a verdict

---

## Example Output

```
### Strengths
- Clean database schema with proper migrations (db.ts:15–42)
- Comprehensive test coverage: 18 tests covering all edge cases
- Good error handling with fallbacks (summarizer.ts:85–92)

### Issues

#### Important
1. Missing help text in CLI wrapper
   File: index-conversations.ts:1–31
   Problem: No --help flag — users won't discover --concurrency option
   Fix: Add --help case with usage examples

2. Date validation missing
   File: search.ts:25–27
   Problem: Invalid dates silently return no results
   Fix: Validate ISO format, throw descriptive error with example

#### Minor
1. No progress counter for long operations
   File: indexer.ts:130
   Problem: Users don't know how long to wait
   Fix: Add "X of Y" counter

### Recommendations
- Consider a config file for excluded projects to improve portability

### Assessment

**Ready to merge: With fixes**

**Reasoning:** Core implementation is solid with good architecture and tests.
Important issues are easily fixed and do not affect core functionality.
```

---

Worker compliance: followed code-review-requester format