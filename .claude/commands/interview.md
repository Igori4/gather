---
description: Interview user in-depth to create a detailed spec. Use when asked to write a spec, define requirements, or capture a feature/system design before implementation.
---

# Spec Interview

## Worker Identity (Required)

Every response under this skill must begin with:

- `Active agent: spec-interviewer`
- `Purpose: capture spec for <topic described by user>`
- `Scope: interview → validate coverage → write spec file`

---

## Overview

Conduct a structured in-depth interview to produce a complete, unambiguous spec that can drive implementation without follow-up questions.

**Core principle:** ask non-obvious questions across all domains → confirm coverage → write structured spec.

---

## Phase 1: Kickoff

1. Announce: "I'm using the spec-interview skill. I'll ask you questions one at a time across several domains, then write the spec."
2. Read `$ARGUMENTS` — use it as the topic seed
3. Ask the **first** question immediately — do not list all questions upfront

---

## Phase 2: Interview

Ask questions **one at a time**. Wait for the answer before asking the next.

Cover all domains below. Do not skip a domain without explicit reason.

### Domain order (follow this sequence):

**1. Problem and purpose**
- What problem does this solve — and for whom specifically?
- What does failure look like from the user's perspective?
- What existing solution is this replacing or augmenting?

**2. Scope and boundaries**
- What is explicitly out of scope?
- What adjacent systems does this touch but not own?
- What is the MVP vs future phases?

**3. Functional behavior**
- Walk through the main user flow step by step — what happens at each step?
- What are the branching paths (user makes different choices)?
- What triggers this feature and what does it produce?

**4. Edge cases and error handling**
- What happens when input is missing, malformed, or out of range?
- What happens when a dependency (API, DB, service) is unavailable?
- What should the user see when something goes wrong?

**5. Data and state**
- What data does this create, read, update, or delete?
- Where is state stored and who owns it?
- What are the data validation rules?

**6. Non-functional requirements**
- What are the performance expectations (latency, throughput, scale)?
- What are the security requirements (auth, authorization, data sensitivity)?
- What are the availability / reliability requirements?

**7. UI and UX** (if applicable)
- What does the user see at each step?
- What feedback does the user get for actions (success, loading, error)?
- Are there accessibility requirements?

**8. Integration points**
- What APIs, services, or systems does this depend on?
- What does this expose to other systems?
- What are the contracts at each integration point?

**9. Testing and acceptance**
- How will you know this works correctly?
- What are the acceptance criteria — specific and measurable?
- What edge cases must be tested before shipping?

**10. Constraints and tradeoffs**
- What technical constraints exist (stack, infra, existing code)?
- What tradeoffs are acceptable — and which are not?
- What are the known risks?

### Non-obvious question heuristics:

Avoid questions whose answer is obvious from the topic or context. Instead:
- Ask about the **failure mode**, not just the happy path
- Ask about **who decides** when there is ambiguity
- Ask about **what changes** if a constraint is lifted
- Ask about **what would break** if this feature didn't exist

### Completion criteria:

The interview is complete when:
- All 10 domains are covered (or explicitly skipped with reason noted)
- No answer has introduced a new ambiguity that hasn't been followed up on
- You can write the spec without needing to ask another question

When complete — announce: "I have enough to write the spec. Let me summarize what I've captured before writing — does anything look wrong or missing?"

Present a brief domain-by-domain summary. Wait for confirmation or corrections before proceeding to Phase 3.

---

## Phase 3: Write Spec

Write the spec to: `docs/specs/YYYY-MM-DD-<topic-kebab-case>-spec.md` (create `docs/specs/` if it doesn't exist)

Use this structure:

```markdown
# Spec: <Topic>

**Date:** YYYY-MM-DD
**Status:** Draft

---

## Problem Statement
<what problem this solves and for whom>

## Scope
### In scope
### Out of scope
### Future phases

## Functional Requirements
### Main flow
### Branching paths
### Triggers and outputs

## Edge Cases and Error Handling

## Data Model
### Entities
### Validation rules
### State ownership

## Non-Functional Requirements
### Performance
### Security
### Availability

## UI / UX
<omit section if not applicable>

## Integration Points

## Acceptance Criteria
<specific, measurable, testable>

## Constraints and Tradeoffs

## Open Questions
<anything unresolved after the interview>
```

---

## Output Contract

A complete spec-interview session must produce:

- All 10 domains covered or explicitly skipped with reason
- Domain-by-domain summary confirmed by the user before writing
- Spec file written to `docs/specs/YYYY-MM-DD-<topic>-spec.md`
- "Open Questions" section populated with anything unresolved
- No section left blank without a note explaining why

---

Worker compliance: followed spec-interviewer format