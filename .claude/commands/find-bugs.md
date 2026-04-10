---
description: Find bugs, security vulnerabilities, and code quality issues in local branch changes. Use when asked to review changes, find bugs, security review, or audit code on the current branch.
---

# Find Bugs

## Worker Identity (Required)

Every response under this skill must begin with:

- `Active agent: find-bugs`
- `Purpose: security and bug review of branch changes`
- `Scope: <list of changed files in scope / what is explicitly excluded>`

---

## Overview

Review changes on this branch for bugs, security vulnerabilities, and code quality issues.

**Do not make changes — report findings only.** The user decides what to address.

---

## Phase 1: Complete Input Gathering

**Get the full diff:**

```bash
# Primary — works with GitHub CLI
git diff $(gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name')...HEAD

# Fallback if gh is not available
git diff main...HEAD
# or
git diff master...HEAD
# or ask the user: "What is the default branch name?"
```

If output is truncated — read each changed file individually until every changed line has been seen.

**If diff is empty:** announce "No changes detected on this branch compared to the default branch." and stop — do not invent a review.

List all modified files before proceeding to Phase 2.

---

## Phase 2: Attack Surface Mapping

For each changed file, identify and list:

- All user inputs (request params, headers, body, URL components)
- All database queries
- All authentication / authorization checks
- All session / state operations
- All external calls
- All cryptographic operations

If a changed file has no attack surface (e.g. config, docs, types only) — note it explicitly and skip Phase 3 for that file.

---

## Phase 3: Security Checklist

Scan every item for every file with an attack surface. Priority order — stop and escalate Critical findings immediately, do not wait for the full checklist:

**Critical priority (scan first):**
- [ ] **Injection** — SQL, command, template, header injection
- [ ] **Authentication** — auth checks on all protected operations?
- [ ] **Authorization / IDOR** — access control verified, not just auth?
- [ ] **Cryptography** — secure random, proper algorithms, no secrets in logs?

**High priority:**
- [ ] **XSS** — all outputs in templates properly escaped?
- [ ] **CSRF** — state-changing operations protected?
- [ ] **Race conditions** — TOCTOU in any read-then-write patterns?

**Medium priority:**
- [ ] **Session** — fixation, expiration, secure flags?
- [ ] **Information disclosure** — error messages, logs, timing attacks?
- [ ] **DoS** — unbounded operations, missing rate limits, resource exhaustion?
- [ ] **Business logic** — edge cases, state machine violations, numeric overflow?

---

## Phase 4: Verification

For each potential issue found in Phase 3:

1. Check if it is already handled elsewhere **in the changed code** (not the full repo)
2. Check if an existing test in the **same or adjacent test file** covers the scenario
3. Read surrounding context to confirm the issue is real

Do not sweep the entire repository — limit search to changed files and their direct test counterparts.

---

## Phase 5: Pre-Conclusion Audit

⚠️ **This phase is mandatory. Do not skip it.**

Before writing findings:

1. List every file reviewed — confirm each was read completely
2. List every checklist item — note: issue found / confirmed clean / could not verify
3. List any areas that could NOT be fully verified and explain why
4. Only then produce the final findings

---

## Output Format

**Priority order:** Critical → High → Medium → Low  
**Skip:** stylistic and formatting issues

For each issue:

```
**File:Line** — brief description
**Severity:** Critical / High / Medium / Low
**Problem:** what is wrong
**Evidence:** why this is real (not already fixed, no existing test, specific code reference)
**Fix:** concrete suggestion
**References:** OWASP, RFC, or other standards if applicable
```

If nothing significant is found — say so explicitly. Do not invent issues.

---

## Output Contract

A complete find-bugs review must produce:

- List of all files reviewed with confirmation each was read fully
- Security checklist result per file: issue found / clean / unverifiable
- Findings in priority order with Evidence field populated for each
- List of unverifiable areas with reasons
- Explicit statement if no issues were found

If Phase 1 returns an empty diff — stop and report that. No further phases needed.

## After Review

To address findings — route through `using-superpowers`:
- Critical/High bugs → pipeline 2 (`bug-repro-triager -> feature-implementer -> ...`)
- Security issues → pipeline 2 with `systematic-debugging` skill
- Minor issues → log for later or pipeline 1

---

Worker compliance: followed find-bugs format