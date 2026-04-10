---
description: Use when creating new skills, editing existing skills, or verifying skills work before deployment
---

# Writing Skills

## Worker Identity (Required)

Every response under this skill must begin with:

- `Active agent: skill-writer`
- `Purpose: create / edit / verify skill <skill-name>`
- `Scope: <which skill is in scope / what phase: RED / GREEN / REFACTOR>`

---

## Overview

**Writing skills IS Test-Driven Development applied to process documentation.**

Write pressure scenarios (tests), watch agents fail without the skill (RED), write the skill (GREEN), watch agents comply (GREEN verified), close loopholes (REFACTOR).

**Core principle:** If you did not watch an agent fail without the skill, you do not know if the skill teaches the right thing.

**Required background:** Understand the `test-driven-development` skill before using this one. This skill adapts the same RED-GREEN-REFACTOR cycle to documentation.

---

## The Iron Law

```
NO SKILL WITHOUT A FAILING TEST FIRST
```

Wrote the skill before running a baseline scenario? Delete it. Start over.

**No exceptions:**
- Not for "simple additions"
- Not for "just adding a section"
- Not for "documentation updates"
- Delete means delete

---

## What Is a Skill?

A skill is a reference guide for proven techniques, patterns, or tools that help future Claude instances find and apply effective approaches.

**Skills are:** reusable techniques, patterns, tools, reference guides

**Skills are not:** narratives about how you solved a problem once

---

## When to Create a Skill

**Create when:**
- Technique was not intuitively obvious
- You would reference it again across projects
- Pattern applies broadly, not just to one project

**Do not create for:**
- One-off solutions
- Standard practices well-documented elsewhere
- Project-specific conventions — put those in the project's config file
- Mechanical constraints — if enforceable with tooling, automate it instead

---

## TDD Mapping for Skills

| TDD Concept | Skill Creation |
|---|---|
| Test case | Pressure scenario with subagent |
| Production code | Skill document (.md file) |
| Test fails (RED) | Agent violates rule without skill (baseline) |
| Test passes (GREEN) | Agent complies with skill present |
| Refactor | Close loopholes while maintaining compliance |
| Write test first | Run baseline scenario BEFORE writing skill |
| Watch it fail | Document exact rationalizations agent uses |
| Minimal code | Write skill addressing those specific violations |
| Watch it pass | Verify agent now complies |
| Refactor cycle | Find new rationalizations → plug → re-verify |

---

## Skill File Structure

**Frontmatter (YAML):**
- `description` — required, max 1024 characters total for all frontmatter
- `allowed-tools` — optional
- `argument-hint` — optional

```markdown
---
description: Use when [specific triggering conditions and symptoms]
---

# Skill Name

## Overview
What is this? Core principle in 1–2 sentences.

## When to Use
Bullet list with symptoms and use cases. When NOT to use.

## Core Pattern
Before/after code comparison (for techniques and patterns).

## Quick Reference
Table or bullets for scanning common operations.

## Common Mistakes
What goes wrong and how to fix it.
```

---

## Claude Search Optimization (CSO)

**Critical for discovery:** future Claude must FIND the skill to use it.

### Description Field — Triggering Conditions Only

**The description must describe WHEN to use the skill, never what the skill does.**

Testing revealed that when a description summarizes the skill's workflow, Claude may follow the description instead of reading the full skill. A description saying "code review between tasks" caused Claude to do ONE review, even though the skill clearly showed TWO (spec compliance then code quality). Changing to "Use when executing implementation plans with independent tasks" fixed this — Claude read the full skill and followed the two-stage process.

**Format:** start with "Use when..."

```yaml
# Bad — summarizes workflow, Claude follows this instead of reading skill
description: Use when executing plans - dispatches subagent per task with code review between tasks

# Bad — too much process detail
description: Use for TDD - write test first, watch it fail, write minimal code, refactor

# Good — triggering conditions only, no workflow summary
description: Use when executing implementation plans with independent tasks in the current session

# Good — describes the problem, not the solution
description: Use when tests have race conditions, timing dependencies, or pass/fail inconsistently
```

**Content rules:**
- Describe the problem or context, not the skill's steps
- Use concrete triggers and symptoms
- Keep technology-agnostic unless the skill is technology-specific
- Write in third person (injected into system prompt)
- Never summarize the skill's process or workflow

### Keyword Coverage

Use words Claude would search for:
- Error messages: "Hook timed out", "race condition", "ENOTEMPTY"
- Symptoms: "flaky", "hanging", "zombie", "pollution"
- Synonyms: "timeout / hang / freeze", "cleanup / teardown / afterEach"
- Tools: actual commands, library names, file types

### Token Efficiency

**Target word counts:**
- Frequently-loaded skills: under 200 words total
- Other skills: under 500 words — still be concise

**Techniques:**
- Reference `--help` instead of documenting all flags inline
- Cross-reference other skills instead of repeating their content
- One excellent example beats multiple mediocre ones
- Do not implement examples in multiple languages — one great example is enough

### Naming

Use active voice, verb-first, gerunds work well for processes:
- `condition-based-waiting` not `async-test-helpers`
- `writing-plans` not `plan-writing`
- `root-cause-tracing` not `debugging-techniques`

---

## RED-GREEN-REFACTOR for Skills

### RED — Write Failing Test (Baseline)

Run pressure scenario with a subagent WITHOUT the skill. Document:
- What choices did they make?
- What rationalizations did they use (verbatim)?
- Which pressures triggered violations?

You must see what agents naturally do before writing the skill.

### GREEN — Write Minimal Skill

Write a skill that addresses those specific rationalizations. Do not add content for hypothetical cases.

Run the same scenarios WITH the skill. Agent should now comply.

### REFACTOR — Close Loopholes

Agent found a new rationalization? Add an explicit counter. Re-test until bulletproof.

---

## Testing by Skill Type

| Skill type | Test with | Success criteria |
|---|---|---|
| **Discipline-enforcing** (TDD, verification) | Pressure scenarios with combined stressors: time + sunk cost + exhaustion | Agent follows rule under maximum pressure |
| **Technique** (condition-based-waiting) | Application scenarios, edge cases, missing-information tests | Agent successfully applies technique to new scenario |
| **Pattern** (mental models) | Recognition scenarios, counter-examples | Agent correctly identifies when/how to apply |
| **Reference** (API docs, guides) | Retrieval scenarios, gap testing | Agent finds and correctly applies reference information |

---

## Bulletproofing Against Rationalization

### Close every loophole explicitly

**Bad:**
```markdown
Write code before test? Delete it.
```

**Good:**
```markdown
Write code before test? Delete it. Start over.

No exceptions:
- Do not keep it as "reference"
- Do not "adapt" it while writing tests
- Delete means delete
```

### Address "spirit vs letter" arguments

Add early in the skill:
```markdown
**Violating the letter of the rules is violating the spirit of the rules.**
```

### Build a rationalization table

Capture every excuse agents used in baseline testing:

```markdown
| Excuse | Reality |
|---|---|
| "Too simple to test" | Simple code breaks. Test takes 30 seconds. |
| "I'll test after" | Tests passing immediately prove nothing. |
```

### Create a Red Flags list

```markdown
## Red Flags — Stop and Start Over
- [specific rationalization observed in baseline]
- [another rationalization]

All of these mean: delete and start over.
```

---

## Common Mistakes

| Mistake | Fix |
|---|---|
| Narrative example ("in session X we found...") | Rewrite as reusable pattern — remove session reference |
| Multi-language examples | Keep one excellent example in the most relevant language |
| Flowchart for linear steps | Use numbered list instead |
| Generic labels (step1, helper2) | Labels must have semantic meaning |
| Description summarizes workflow | Description = triggering conditions only |
| Skill written before baseline test | Delete and follow Iron Law |

---

## Deployment Checklist (Per Skill — No Batching)

**Stop after each skill and complete this before starting the next.**

**RED Phase:**
- [ ] Pressure scenarios created (3+ combined pressures for discipline skills)
- [ ] Scenarios run WITHOUT skill — baseline behavior documented verbatim
- [ ] Rationalization patterns identified

**GREEN Phase:**
- [ ] Frontmatter: description starts with "Use when...", triggering conditions only, no workflow summary
- [ ] Keywords throughout for search (errors, symptoms, tools)
- [ ] Skill addresses specific baseline failures from RED — not hypothetical cases
- [ ] One excellent example, not multi-language
- [ ] Scenarios run WITH skill — agent now complies

**REFACTOR Phase:**
- [ ] New rationalizations identified and countered
- [ ] Rationalization table built from all test iterations
- [ ] Red Flags list created
- [ ] Re-tested until bulletproof

**Quality:**
- [ ] Word count within target (under 500 words for most skills)
- [ ] No narrative storytelling or session-specific references
- [ ] No slash-command syntax in cross-references — use skill names

---

## Output Contract

A complete skill-writing session must produce:

- Baseline test run documented (RED) — agent behavior without skill recorded verbatim
- Skill file written addressing those specific failures (GREEN)
- Compliance test run documented (GREEN verified) — agent behavior with skill confirmed
- Loopholes closed and re-tested (REFACTOR)
- Deployment checklist completed for this skill before any other skill is started
- Skill file saved with correct naming convention

If the baseline scenario was not run — the skill is untested. Do not deploy.

---

Worker compliance: followed skill-writer format