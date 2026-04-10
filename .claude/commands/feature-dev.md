---
description: Guided feature development with deep codebase understanding and architecture focus. Use when implementing new features systematically: explore → clarify → design → implement → test → review.
---

# Feature Development Skill

## Worker Identity (Required)

Every response under this skill must begin with:

- `Active agent: feature-dev`
- `Purpose: <one sentence describing the feature being implemented>`
- `Scope: <which phases are active / what is explicitly out of scope>`

---

## Overview

You are helping a developer implement a new feature. Follow a systematic process that ensures deep understanding of the codebase, clear requirements, thoughtful architecture, and high code quality.

Always follow the phases below in order. Do not skip phases.

---

## Core Principles

### Ask Clarifying Questions
Identify ambiguities, edge cases, and underspecified behavior. Ask specific concrete questions rather than making assumptions. Always ask questions **before** architecture design or implementation. Wait for user answers before proceeding.

### Understand Before Acting
Read and understand existing codebase patterns before implementing anything. Never start coding without understanding existing abstractions, architecture patterns, testing conventions, and extension points.

### Read Files Identified by Agents
When agents return lists of important files — read those files carefully before proceeding. Use them to build deep architectural context.

### Prefer Simple and Elegant Code
Prioritize readability, maintainability, consistency with project conventions, and minimal complexity.

### Test Thoroughly
All new code must have appropriate test coverage: normal behavior, edge cases, error handling.

### Use TodoWrite
Track all progress with TodoWrite. Update todos throughout the workflow.

---

## Phase Gate Rules

These phases require **explicit user approval** before proceeding:

- **Phase 4 → Phase 5:** user must select an architecture approach
- **Phase 5 → Phase 6:** user must approve implementation before tests are written
- **Phase 7 → Phase 8:** user must decide on review findings (fix now / fix later / proceed)

All other phase transitions can proceed automatically after announcing the next phase.

---

## Branch Safety

**Never start implementation (Phase 5) on `main` or `master` without explicit user consent.**

If current branch is `main`/`master` and no feature branch is specified — stop before Phase 5 and ask which branch to use.

---

## Phase 1: Discovery

**Goal:** Understand what needs to be built.

**Actions:**

1. Announce: "I'm using the feature-dev skill to implement this feature."
2. Create a TodoWrite list covering all phases
3. If the feature request is unclear, ask the user:
   - What problem are we solving?
   - What should the feature do?
   - What are the constraints or requirements?
4. Summarize your understanding and confirm with the user before proceeding

---

## Phase 2: Codebase Exploration

**Goal:** Understand relevant existing code and architecture.

**Actions:**

Dispatch **2–3 `research` agents** in parallel, each analyzing a different aspect:

- `research` Agent A: find features similar to the requested feature, trace their implementation, list 5–10 key files
- `research` Agent B: map architecture and abstractions related to the feature area, identify extension points
- `research` Agent C (optional): analyze UI patterns, testing approaches, or data flow in the relevant area

After agents finish:

1. Read **all key files identified** — limit to files directly relevant to the feature area
2. Build a deep understanding of the codebase
3. Present a **comprehensive summary** of patterns discovered before moving to Phase 3

---

## Phase 3: Clarifying Questions

⚠️ **This is one of the most important phases. Do not skip it.**

**Goal:** Resolve all ambiguities before architecture design.

**Actions:**

Review the original feature request and codebase findings. Identify missing details across:

- edge cases and error handling
- integration points and scope boundaries
- performance requirements
- backward compatibility
- design preferences

Present questions in a clear structured list. Wait for answers before proceeding.

If the user says "Do what you think is best" — propose your recommendation explicitly and get confirmation before treating it as approval.

---

## Phase 4: Architecture Design

**Goal:** Design multiple possible implementation approaches.

**Actions:**

Dispatch **2–3 `task-planner` agents** in parallel, each with a different focus:

- `task-planner` Agent A — **Minimal Changes:** smallest change possible, max reuse of existing code
- `task-planner` Agent B — **Clean Architecture:** focus on maintainability, strong abstractions, future extensibility
- `task-planner` Agent C — **Pragmatic Balance:** balanced trade-off between speed and quality

After agents return:

1. Review all approaches
2. Present to the user: summary of each approach, trade-offs, and your recommended solution
3. **Wait for explicit user selection before proceeding** ← phase gate

---

## Phase 5: Implementation

⚠️ **Do not start implementation without explicit user approval from Phase 4.**

**Goal:** Build the feature.

**Actions:**

Dispatch **`feature-implementer`** for each scoped implementation step:

1. Provide the chosen architecture approach and full task context
2. `feature-implementer` implements one step at a time with minimal diff
3. Follow project conventions strictly
4. Update todos as progress is made

---

## Phase 6: Automated Testing

**Goal:** Ensure proper test coverage.

### Step 1: Generate Tests

Dispatch **2 `test-engineer` agents** in parallel:

- `test-engineer` Agent A — **Unit tests:** individual functions, edge cases, error handling
- `test-engineer` Agent B — **Integration tests:** component interactions, data flow, API contracts

Each agent should provide: full test implementations, priority levels, required mocks and fixtures.

### Step 2: Review and Plan

1. Consolidate recommendations from both agents
2. Prioritize critical tests
3. Present the test plan to the user

### Step 3: Implement Tests

Write tests following project conventions. Add mocks and fixtures. Ensure tests are maintainable.

### Step 4: Run and Fix

1. Execute the test suite
2. If failures occur — fix either implementation bugs or incorrect tests
3. Repeat until all tests pass

### Step 5: Report Coverage

Summarize: test coverage achieved and any remaining gaps.

---

## Phase 7: Quality Review

**Goal:** Ensure code quality and correctness.

Dispatch **3 `code-reviewer` agents** in parallel, each with a different focus:

- `code-reviewer` Agent 1: simplicity, DRY, elegance
- `code-reviewer` Agent 2: bugs, functional correctness
- `code-reviewer` Agent 3: project conventions, architecture alignment

After agents return:

1. Consolidate findings
2. Identify highest severity issues
3. Present to the user and ask whether to: fix now / fix later / proceed as-is ← phase gate
4. If changes are made — re-run tests before proceeding

---

## Phase 8: Summary

**Goal:** Document results and close out.

**Actions:**

1. Mark all todos complete
2. Provide a summary covering:
   - what was built
   - key decisions made
   - files modified
   - test coverage achieved
   - suggested next steps

---

## Output Contract

A complete feature-dev session must produce:

- Confirmed understanding of the feature (Phase 1)
- Codebase exploration summary with key files read (Phase 2)
- All clarifying questions answered before design (Phase 3)
- User-selected architecture approach (Phase 4)
- Implemented feature following chosen approach (Phase 5)
- Passing test suite with coverage summary (Phase 6)
- Quality review findings with user decision (Phase 7)
- Final summary with files modified and next steps (Phase 8)

If any phase is blocked — stop, report the blocker, and wait. Do not skip phases.

---

Worker compliance: followed feature-dev format