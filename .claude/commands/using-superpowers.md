---
description: Use when starting any conversation - routes work through the correct worker agents before any task action, requiring explicit worker selection and visible compliance
---

<EXTREMELY-IMPORTANT>
If you think there is even a 1% chance a skill or worker agent might apply to what you are doing, you ABSOLUTELY MUST use it.

IF A SKILL OR WORKER AGENT APPLIES TO THE TASK, YOU DO NOT HAVE A CHOICE. YOU MUST USE IT.

This is not negotiable. This is not optional. You cannot rationalize your way out of this.
</EXTREMELY-IMPORTANT>

## Purpose

This skill enforces disciplined execution by requiring:

1. **Skill-first thinking**
2. **Worker-agent routing before any task work**
3. **Visible worker self-identification**
4. **Structured outputs per worker**
5. **No silent fallback to generic behavior**

This skill is a **router + gatekeeper**. It must be applied before planning, coding, testing, reviewing, or clarifying questions whenever a relevant worker agent might help.

---

## Core Rule

**Before any response or action, you must:**

1. Determine whether any skill applies (even 1% chance = yes)
2. Determine whether any worker agent applies
3. Select and announce the worker agent(s)
4. Execute only the current worker
5. Require worker self-identification and structured output

If no worker agent applies, explicitly say so and proceed normally.

---

## Mandatory Worker Routing (No Exceptions)

### Required routing step (before any task work)

Before doing any planning, coding, testing, reviewing, refactoring, or analysis, you must output:

- `Selected worker agents: <ordered list>`
- `Reason: <why these agents>`
- `Current agent: <first agent to execute>`

### No work before routing

Do **not**:

- write code
- propose implementation steps
- review code
- write tests
- summarize fixes
- ask clarifying questions about execution details

until worker routing has been announced.

---

## Worker Self-Identification (Required)

Every response produced under a worker agent must begin with:

- `Active agent: <agent name>`
- `Purpose: <one sentence>`
- `Scope: <what is in scope / out of scope>`

This is required so compliance is visible and auditable.

---

## Worker Compliance Footer (Required)

Every worker response must end with:

- `Worker compliance: followed <agent-name> format`

If a worker cannot follow its format due to missing context, it must say so explicitly and stop.

---

## If No Worker Applies

If no worker agent clearly applies, you must explicitly output:

- `Selected worker agents: none`
- `Reason: no matching worker agent`
- `Current agent: none`

Then proceed with a normal response.

Do not silently skip routing.

---

## Worker Selection Heuristics (Default Pipelines)

Use these default pipelines unless there is a strong reason to change them.

### 1) New feature / behavior change

Default pipeline:

- `task-planner -> feature-implementer -> test-engineer -> code-reviewer -> acceptance-checker`

Use `docs-updater` if:

- public behavior changed
- configuration changed
- API or usage changed
- migration note may be needed

### 2) Bug fix / runtime failure / stack trace

Default pipeline:

- `bug-repro-triager -> test-engineer -> feature-implementer -> code-reviewer -> acceptance-checker`

Recommended bug-fix flow:

- reproduce first
- failing test next
- minimal fix
- regression coverage
- review
- acceptance mapping

### 3) Refactor / simplification / maintainability cleanup

Default pipeline:

- `task-planner -> code-simplifier -> code-reviewer -> acceptance-checker`

Add `test-engineer` if behavior-preservation risk is non-trivial.

### 4) Unfamiliar library / API / framework behavior

Default pipeline:

- `api-researcher -> task-planner -> feature-implementer -> test-engineer -> code-reviewer`

### 5) Test-only request

Default pipeline:

- `test-engineer -> code-reviewer` (review tests if non-trivial)
- optionally `acceptance-checker` if tests map to explicit criteria

### 6) Review-only request

Default pipeline:

- `code-reviewer`

### 7) Docs-only request

Default pipeline:

- `docs-updater`
- optionally `code-reviewer` if docs describe risky technical behavior

### 8) Figma screenshot / mockup / static UI → code

Trigger skill: `figma-screenshot-to-ui`
Default pipeline:

- `task-planner -> feature-implementer -> code-reviewer`

Use `task-planner` to:

- decompose screenshot regions and layout model
- define style tokens and component map before any code

Add `api-researcher` if:

- target framework or styling approach is unfamiliar

Add `test-engineer` if:

- interactive states (forms, modals, animations) carry regression risk

Triggers:

- user provides a screenshot, Figma export, or mockup image
- user says "make this look like", "convert this design", "replicate this UI"
- any request for pixel-accurate or high-fidelity UI reproduction

### 9) Debugging / unexpected behavior / test failure

Trigger skill: `systematic-debugging`
Default pipeline:

- `bug-repro-triager -> feature-implementer -> test-engineer -> code-reviewer`

Use `systematic-debugging` skill to enforce:

- root cause investigation before any fix
- evidence gathering in multi-component systems
- hypothesis-first approach

Triggers:

- any bug, test failure, or unexpected behavior
- "why is X not working", "this is broken", "tests fail"
- any request to fix something without a known root cause

### 10) Claiming work is complete / before commit or PR

Trigger skill: `verification-before-completion`

This is not a pipeline — it is a gate that applies before any completion claim.

Triggers:

- about to say "done", "fixed", "tests pass", "ready to merge"
- about to commit, push, or create a PR
- about to mark a task complete and move on
- any expression of satisfaction about work state

Always run the verification command in the same message before making the claim.

### 11) Have a plan, executing in current session

Trigger skill: `subagent-driven-development`
Default pipeline:

- `plan-executor` dispatching `implementer -> spec-reviewer -> quality-reviewer` per task

Use when:

- implementation plan exists
- tasks are mostly independent
- staying in the current session

Use `executing-plans` skill instead if:

- running in a parallel session
- human review is required between every task

### 12) Have a plan, executing in separate / parallel session

Trigger skill: `executing-plans`
Default pipeline:

- `plan-executor` with batch checkpoints and human review between batches

### 13) Have spec or requirements, need implementation plan

Trigger skill: `writing-plans`
Default pipeline:

- `plan-writer -> subagent-driven-dev` (auto-handoff after plan is saved)

Use `brainstorming` skill first if:

- requirements are unclear or underspecified
- need to explore approaches before writing plan

### 14) Security audit / bug hunt on current branch

Trigger skill: `find-bugs`
Default pipeline:

- `find-bugs` (single skill, no worker chain needed)

Triggers:

- "review my changes for bugs"
- "security review", "audit this branch"
- "find issues before I merge"

### 15) Implementation complete, need to finish branch

Trigger skill: `finishing-a-development-branch`
Default pipeline:

- `branch-finisher` (verify tests → present options → execute → cleanup)

Triggers:

- all tasks complete and verified
- "ready to merge", "how do I finish this"
- called automatically by `executing-plans` and `subagent-driven-development` after all tasks done

### 16) Receiving code review feedback

Trigger skill: `receiving-code-review`
Default pipeline:

- `code-review-receptor` (clarify → evaluate → implement one at a time)

Triggers:

- received PR review comments
- "reviewer said X", "feedback from review"
- about to implement review suggestions

### 17) Vague idea, no spec yet

Trigger skill: `brainstorming`
Default pipeline:

- `task-planner` (interview mode) -> `plan-writer`

Triggers:

- "I want to build X" without clear requirements
- "help me think through Y"
- no spec or plan exists yet

### 18) Multiple independent tasks (3+)

Trigger skill: `dispatching-parallel-agents`
Default pipeline:

- `parallel-dispatcher` (one agent per independent domain, concurrent)

Use when:

- 3+ failures across different files/subsystems
- each problem can be understood without context from others
- agents would not edit the same files

### 19) Creating or editing a skill

Trigger skill: `writing-skills`
Default pipeline:

- `skill-writer` (RED baseline → GREEN write → REFACTOR close loopholes)

Triggers:

- "create a new skill", "update this skill"
- "this skill isn't working", "add a section to skill X"

### 20) Guided feature development with deep exploration

Trigger skill: `feature-dev`
Default pipeline:

- `feature-dev` (discovery → exploration → clarify → design → implement → test → review)

Use instead of pipeline 1 when:

- feature requires deep codebase exploration before any design
- multiple architecture approaches should be compared
- feature is large enough to warrant parallel agents at each phase

### 21) Domain research / algorithm / technical theory question

Trigger agent: `research`
Default pipeline:

- `research` (single agent)

Use `api-researcher` instead if:

- question is about a specific library API or framework integration

Triggers:

- "what algorithm should I use for X"
- "compare approaches for Y"
- "research state-of-the-art for Z"
- questions about CV, robotics, real-time systems, papers, trade-off analysis

### 22) Requesting code review on completed work

Trigger skill: `requesting-code-review`
Default pipeline:

- `code-review-requester` (get SHAs → fill template → dispatch reviewer → act on feedback)

Triggers:

- after completing a task or batch of work
- "review what I just implemented"
- before merging, as part of `subagent-driven-development` or `executing-plans` flow

Note: distinct from pipeline 16 (`receiving-code-review`) which handles incoming feedback from others.

### 23) In-depth interview to capture requirements or decisions

Trigger skill: `interview`
Default pipeline:

- `interview` (structured in-depth interview → saved output file)

Use `brainstorming` instead if:

- goal is exploring approaches, not capturing structured requirements
- no formal output document is needed

Triggers:

- "interview me about X"
- "ask me questions about Y before we start"
- need to capture decisions, context, or requirements through dialogue

### 24) Web performance investigation or optimization

Trigger skill: `performance-audit`
Default pipeline:

- `performance-auditor` (baseline measurement → bottleneck identification → fix → verify)

Triggers:

- "the site is slow", "page loads too slowly", "feels sluggish"
- "Lighthouse score is low", "Core Web Vitals", "LCP", "CLS", "INP"
- "bundle is too big", "reduce bundle size", "improve load time"
- any request to optimize, speed up, or profile a web app

### 25) Implementing a feature or bugfix using test-first approach

Trigger skill: `test-driven-development`
Default pipeline:

- `tdd-practitioner` (RED failing test → GREEN minimal code → REFACTOR → repeat)

Use instead of pipeline 1/2 when:

- user explicitly wants TDD methodology enforced
- "write tests first", "TDD", "test-driven", "red-green-refactor"

Triggers:

- "write a failing test first"
- "use TDD for this"
- any feature/bugfix where test-first discipline is explicitly required

---

## Worker Roles and Boundaries (Enforce Role Discipline)

Workers must stay in role. Do not let one worker silently do another worker's job unless explicitly requested.

### `task-planner`

- Does: clarify goals, define scope, plan steps, risks, tests, done criteria
- Does not: write production code

### `feature-implementer`

- Does: implement one scoped plan step with minimal diff
- Does not: broad refactor, rewrite plan, review code, do unrelated cleanup

### `test-engineer`

- Does: write/update tests, regression coverage, edge cases, repro tests
- Does not: change production code unless absolutely necessary and explicitly justified

### `code-reviewer`

- Does: critique correctness, regressions, standards, test adequacy
- Does not: rewrite implementation unless asked

### `acceptance-checker`

- Does: map implementation/tests to acceptance criteria with evidence
- Does not: optimize code or invent missing evidence

### `docs-updater`

- Does: update docs/readme/changelog/migration notes for recent changes
- Does not: invent undocumented behavior

### `api-researcher`

- Does: research external APIs/libraries and produce implementation guidance
- Does not: implement production code unless explicitly asked

### `bug-repro-triager`

- Does: produce repro steps, hypotheses, investigation plan, failing-test strategy
- Does not: implement fix

### `code-simplifier`

- Does: simplify/refine recently modified code while preserving behavior
- Does not: alter functionality or broaden scope

### `tdd-practitioner`

- Does: enforce RED-GREEN-REFACTOR cycle — write failing test, watch it fail, write minimal code, watch it pass, refactor
- Does not: write production code before a failing test exists; skip any verify step

### `performance-auditor`

- Does: measure baseline (Lighthouse, bundle size, network), identify specific bottleneck from data, implement targeted fix, verify improvement with re-measurement
- Does not: propose fixes without measurement data; optimize multiple things simultaneously

### `research`

- Does: research algorithms, domain concepts, papers, state-of-the-art approaches, trade-off analysis
- Does not: implement production code; use `api-researcher` for library/API integration questions

---

## Skill Priority

When multiple skills or worker agents might apply, use this order:

1. **Process / routing skill first** (this skill)
2. **Research / triage workers** (when uncertainty exists)
3. **Planning worker**
4. **Implementation worker**
5. **Test worker**
6. **Review worker**
7. **Acceptance worker**
8. **Docs/simplification workers** as needed

### Principle

Process determines **how** to approach the task before implementation determines **what** to change.

---

## Red Flags (Rationalization Warnings)

If you think any of these, stop and route to worker agents first:

- "This is simple, I can just answer directly"
- "Let me quickly inspect code first"
- "I can start coding and route later"
- "I need to ask clarifying questions before picking a worker"
- "I already know which worker to use, no need to announce it"
- "The worker format is overkill"
- "I'll do one small thing before routing"
- "I remember the worker behavior from before"

These are signs you are about to skip discipline.

---

## Clarifying Questions Rule

If clarifying questions are needed **and** a worker likely applies:

1. Route first
2. Set `Current agent` to the worker most appropriate for framing the question (usually `task-planner` or `bug-repro-triager`)
3. Ask the clarifying question **in that worker's role format**

Do not skip routing just because the next step is a question.

---

## Scope and Recency Rule (Global)

Unless explicitly instructed otherwise, workers should:

- focus on recently modified code / current task scope
- avoid broad codebase sweeps
- preserve behavior outside scope
- prefer minimal, reviewable diffs
- list assumptions explicitly instead of guessing

---

## Structured Output Enforcement

Workers must follow their own defined output schema. If a worker output does not match its schema, correct course before continuing.

At minimum, all worker outputs must include:

- active identity
- scope
- structured findings/work
- assumptions (when relevant)
- compliance footer

---

## Execution Template (Use This Every Time)

### Step 1: Route

Output:

- `Selected worker agents: ...`
- `Reason: ...`
- `Current agent: ...`

### Step 2: Execute current worker

Output begins with:

- `Active agent: ...`
- `Purpose: ...`
- `Scope: ...`

Then produce that worker's structured output.

### Step 3: End with compliance

Output ends with:

- `Worker compliance: followed <agent-name> format`

### Step 4: Move to next worker (if continuing)

Re-announce:

- `Current agent: <next agent>`

---

## Examples (Behavioral)

### Example: "Add pagination to the users list"

- `Selected worker agents: task-planner -> feature-implementer -> test-engineer -> code-reviewer -> acceptance-checker`
- `Reason: feature implementation changes behavior and carries regression risk`
- `Current agent: task-planner`

### Example: "Fix this stack trace"

- `Selected worker agents: bug-repro-triager -> test-engineer -> feature-implementer -> code-reviewer -> acceptance-checker`
- `Reason: bug fix should establish repro and regression coverage before implementation; systematic-debugging skill applies`
- `Current agent: bug-repro-triager`

### Example: "Can you review these recent changes?"

- `Selected worker agents: code-reviewer`
- `Reason: explicit review request`
- `Current agent: code-reviewer`

### Example: "Convert this Figma screenshot to React"

- `Selected worker agents: task-planner -> feature-implementer -> code-reviewer`
- `Reason: UI conversion requires layout decomposition before implementation; figma-screenshot-to-ui skill applies`
- `Current agent: task-planner`

### Example: "Tests are passing, ready to commit"

- `Selected worker agents: completion-verifier`
- `Reason: completion claim requires fresh verification evidence before asserting; verification-before-completion skill applies`
- `Current agent: completion-verifier`

### Example: "I have a plan, let's implement it"

- `Selected worker agents: subagent-driven-dev`
- `Reason: plan exists, tasks are independent, staying in current session; subagent-driven-development skill applies`
- `Current agent: subagent-driven-dev`

### Example: "Review my branch for security issues"

- `Selected worker agents: find-bugs`
- `Reason: explicit security/bug audit request; find-bugs skill applies`
- `Current agent: find-bugs`

### Example: "I got code review feedback, help me address it"

- `Selected worker agents: code-review-receptor`
- `Reason: receiving review feedback requires evaluation before implementation; receiving-code-review skill applies`
- `Current agent: code-review-receptor`

### Example: "What tracking algorithm should I use for my robotics project?"

- `Selected worker agents: research`
- `Reason: domain/algorithm question requiring state-of-the-art analysis; research agent applies`
- `Current agent: research`

### Example: "I just finished task 3, can you review it?"

- `Selected worker agents: code-review-requester`
- `Reason: requesting review on completed work; requesting-code-review skill applies`
- `Current agent: code-review-requester`

### Example: "Interview me about this feature before we start building"

- `Selected worker agents: interview`
- `Reason: structured interview needed to capture requirements; interview skill applies`
- `Current agent: interview`

### Example: "Use TDD to implement the retry logic"

- `Selected worker agents: tdd-practitioner`
- `Reason: explicit TDD request; test-driven-development skill applies`
- `Current agent: tdd-practitioner`

### Example: "Our LCP is 4.2s and the Lighthouse score dropped to 38"

- `Selected worker agents: performance-auditor`
- `Reason: web performance investigation with specific metric; performance-audit skill applies`
- `Current agent: performance-auditor`

---

## Final Principle

User instructions define **WHAT** needs to happen.
This skill enforces **HOW** the work is approached.

Do not skip routing. Do not skip worker selection. Do not do silent generic work when a worker applies.
