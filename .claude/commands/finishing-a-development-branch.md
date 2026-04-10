---
description: Use when implementation is complete, all tests pass, and you need to decide how to integrate the work - guides completion of development work by presenting structured options for merge, PR, or cleanup
---

# Finishing a Development Branch

## Worker Identity (Required)

Every response under this skill must begin with:

- `Active agent: branch-finisher`
- `Purpose: complete development work on branch <branch-name>`
- `Scope: test verification, merge/PR/discard decision, worktree cleanup`

---

## Overview

Guide completion of development work by presenting clear options and handling the chosen workflow.

**Core principle:** Verify tests → Present options → Execute choice → Clean up.

---

## The Process

### Step 1: Announce and Verify Tests

1. Announce: "I'm using the finishing-a-development-branch skill to complete this work."
2. Detect the project's test command from `package.json`, `Makefile`, `Cargo.toml`, `pyproject.toml`, or equivalent config — do not guess from a slash-separated list
3. Run the detected test command

**If tests fail:**
```
Tests failing (<N> failures). Must fix before completing:

[Show failures]

Cannot proceed with merge/PR until tests pass.
```

Stop. Do not proceed to Step 2.

**If tests pass:** continue to Step 2.

---

### Step 2: Determine Base Branch

```bash
# Check remote default branch
git remote show origin | grep 'HEAD branch' | awk '{print $NF}'
```

If the above fails or there is no remote:

```bash
# Fallback: check common names
git branch --list main master develop | head -1
```

If still unclear — ask: "What is the base branch for this work?"

---

### Step 3: Present Options

Present exactly these 4 options:

```
Implementation complete. Tests passing. What would you like to do?

1. Merge back to <base-branch> locally
2. Push and create a Pull Request
3. Keep the branch as-is (I'll handle it later)
4. Discard this work

Which option?
```

Do not add explanation — keep options concise. Wait for the user's choice before proceeding.

---

### Step 4: Execute Choice

#### Option 1: Merge Locally

```bash
git checkout <base-branch>
git pull
git merge <feature-branch>
<test-command>
```

If tests pass after merge:
```bash
git branch -d <feature-branch>
```

If tests fail after merge — do not delete the branch. Report failures and stop.

Then: proceed to Step 5 (cleanup worktree).

---

#### Option 2: Push and Create PR

```bash
git push -u origin <feature-branch>
```

Generate PR body from git log — do not invent content:

```bash
git log <base-branch>..HEAD --oneline
```

**If `gh` CLI is available:**
```bash
gh pr create --title "<derived from branch name or last commit>" --body "$(cat <<'EOF'
## Summary
<bullet per commit from git log above>

## Test Plan
- All existing tests pass
- [ ] <any manual verification steps implied by the changes>
EOF
)"
```

**If `gh` is not available:** output the PR title and body as text for the user to paste manually. Do not fail silently.

Keep worktree — do not clean up. Proceed to final report.

---

#### Option 3: Keep As-Is

Report: "Keeping branch `<name>`. No changes made."

Do not clean up worktree. Stop here.

---

#### Option 4: Discard

**Confirm first — require exact typed input:**

```
This will permanently delete:
- Branch: <name>
- Commits: <list from git log --oneline>
- Worktree at: <path if applicable>

Type 'discard' to confirm, or anything else to cancel.
```

Wait. Do not proceed until "discard" is received exactly.

If confirmed:
```bash
# Ensure we are not on the branch being deleted
git checkout <base-branch>
# Force delete
git branch -D <feature-branch>
```

Then: proceed to Step 5 (cleanup worktree).

---

### Step 5: Cleanup Worktree

**Only for Options 1 and 4.**

Check if a worktree exists for this branch:
```bash
git worktree list | grep <feature-branch>
```

If found:
```bash
git worktree remove <worktree-path>
```

If not found — skip silently.

**Options 2 and 3:** do not touch the worktree.

---

## Option / Worktree Reference

| Option | Merge | Push | Worktree | Branch |
|--------|-------|------|----------|--------|
| 1. Merge locally | ✓ | — | Remove | Delete (`-d`) |
| 2. Create PR | — | ✓ | Keep | Keep |
| 3. Keep as-is | — | — | Keep | Keep |
| 4. Discard | — | — | Remove | Delete (`-D`) |

---

## Red Flags

**Never:**
- Proceed past Step 1 with failing tests
- Merge without re-verifying tests on the merged result
- Delete work without typed "discard" confirmation
- Force-push without explicit user request
- Run `git branch -D` while still on that branch

**Always:**
- Detect test command from project config — do not guess
- Derive PR content from `git log` — do not invent
- Present exactly 4 options and wait for input
- Clean up worktree only for Options 1 and 4

---

## Output Contract

A complete branch-finisher session must produce:

- Test verification result with command used
- Base branch confirmed
- All 4 options presented and user choice recorded
- Chosen option executed with command output shown
- Worktree cleanup result (removed / kept / not found)
- Final state summary: branch name, base branch, what happened

If tests fail in Step 1 — output stops there. Report failures clearly.

---

## Integration

**Called by:**
- `subagent-driven-development` — after all tasks complete
- `executing-plans` — after all batches complete

---

Worker compliance: followed branch-finisher format