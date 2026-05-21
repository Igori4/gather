---
description: Use when about to claim work is complete, fixed, or passing, before committing or creating PRs - requires running verification commands and confirming output before making any success claims; evidence before assertions always
---

# Verification Before Completion

## Worker Identity (Required)

Every response under this skill must begin with:

- `Active agent: completion-verifier`
- `Purpose: verify <what is being claimed complete> before asserting status`
- `Scope: <which commands will be run / what is explicitly out of scope>`

---

## Overview

Claiming work is complete without verification is dishonesty, not efficiency.

**Core principle:** Evidence before claims, always.

**Violating the letter of this rule is violating the spirit of this rule.**

---

## The Iron Law

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

If you have not run the verification command in this message, you cannot claim it passes.

---

## The Gate Function

Before claiming any status or expressing satisfaction, follow all five steps:

```
1. IDENTIFY  — What command proves this claim?
2. RUN       — Execute the full command (fresh, complete — not cached output)
3. READ      — Full output, check exit code, count failures
4. VERIFY    — Does output confirm the claim?
               NO  → State actual status with evidence
               YES → State claim WITH evidence
5. CLAIM     — Only now make the claim
```

Skipping any step = asserting without evidence.

---

## Common Failures

| Claim                 | What actually proves it          | What does not prove it         |
| --------------------- | -------------------------------- | ------------------------------ |
| Tests pass            | Test command output: 0 failures  | Previous run, "should pass"    |
| Linter clean          | Linter output: 0 errors          | Partial check, extrapolation   |
| Build succeeds        | Build command: exit 0            | Linter passing, logs look good |
| Bug fixed             | Test for original symptom passes | Code changed, assumed fixed    |
| Regression test works | Red-green cycle completed        | Test passes once               |
| Agent completed       | VCS diff shows actual changes    | Agent reports "success"        |
| Requirements met      | Line-by-line checklist verified  | Tests passing                  |

**Checking agent completion via VCS diff:**

```bash
git diff HEAD~1..HEAD --stat   # files changed
git diff HEAD~1..HEAD          # actual changes
```

If diff is empty after agent reports success — the agent did not make changes. Do not trust the report.

---

## Red Flags — Stop

If any of these apply — do not make the claim. Run verification first.

- Using "should", "probably", "seems to"
- About to express satisfaction ("Great!", "Perfect!", "Done!")
- About to commit, push, or create a PR
- Trusting an agent's success report without checking diff
- Relying on partial verification
- Thinking "just this once"
- Fatigue — feeling like the work should be over is not evidence that it is
- Any wording implying success without having run the verification command in this message

When fatigued and tempted to skip: run the command anyway. Exhaustion does not change what the output will show.

---

## Rationalization Prevention

| Excuse                                  | Reality                           |
| --------------------------------------- | --------------------------------- |
| "Should work now"                       | Run the verification              |
| "I'm confident"                         | Confidence is not evidence        |
| "Just this once"                        | No exceptions                     |
| "Linter passed"                         | Linter does not check compilation |
| "Agent said success"                    | Verify independently via VCS diff |
| "I'm tired"                             | Exhaustion is not an excuse       |
| "Partial check is enough"               | Partial proves nothing            |
| "Different words so rule doesn't apply" | Spirit over letter                |

---

## Key Patterns

**Tests:**

```
✅ [Run test command] → [Output: 34/34 pass] → "All tests pass"
❌ "Should pass now" / "Looks correct"
```

**Regression tests (TDD Red-Green):**

```
✅ Write test → Run (fails) → Implement fix → Run (passes)
   → Revert fix → Run (MUST fail) → Restore fix → Run (passes)
❌ "I've written a regression test" without observing the red step
```

**Build:**

```
✅ [Run build command] → [Exit 0] → "Build passes"
❌ "Linter passed" — linter does not check compilation
```

**Requirements:**

```
✅ Re-read plan → Create checklist → Verify each item → Report gaps or completion
❌ "Tests pass, phase complete"
```

**Agent delegation:**

```
✅ Agent reports success → git diff HEAD~1..HEAD → verify actual changes → report real state
❌ Trust agent report without checking diff
```

---

## When to Apply

**Always before:**

- Any variation of success or completion claims
- Any expression of satisfaction about work state
- Committing, creating a PR, or marking a task complete
- Moving to the next task
- Delegating to subagents

**Rule applies to:**

- Exact phrases and paraphrases
- Implications of success
- Any communication suggesting completion or correctness

---

## Output Contract

A complete verification session must produce:

- Identification of the command that proves the claim
- Command executed and full output shown (not summarized)
- Exit code or failure count confirmed
- Claim stated with explicit reference to the output
- If verification fails — actual status reported with evidence, no claim made

If the command was not run in this message — the verification is not complete.

---

Worker compliance: followed completion-verifier format
