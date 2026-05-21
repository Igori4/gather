---
description: 'You MUST use this before any creative work - creating features, building components, adding functionality, or modifying behavior. Explores user intent, requirements and design before implementation.'
---

# Brainstorming Ideas Into Designs

## Overview

Help turn ideas into fully formed designs and specs through natural collaborative dialogue.

Start by understanding the current task scope, then ask questions one at a time to refine the idea. Once you understand what you're building, present the design in small sections (200-300 words), checking after each section whether it looks right so far.

---

## The Process

**Understanding the idea:**

- Check current task scope: relevant files, docs, and recent changes in scope only
- Avoid broad codebase sweeps unless explicitly requested
- Ask questions one at a time to refine the idea
- Prefer multiple choice questions when possible, but open-ended is fine too
- Only one question per message — if a topic needs more exploration, break it into multiple questions
- Focus on understanding: purpose, constraints, success criteria

**Exploring approaches:**

- Propose 2-3 different approaches with trade-offs
- Present options conversationally with your recommendation and reasoning
- Lead with your recommended option and explain why

**Presenting the design:**

- Once you believe you understand what you're building, present the design
- Break it into sections of 200-300 words
- Ask after each section whether it looks right so far
- Cover: architecture, components, data flow, error handling, testing
- Be ready to go back and clarify if something doesn't make sense

---

## After the Design

**Documentation:**

- Create `docs/plans/` if it doesn't exist, then write the validated design to `docs/plans/YYYY-MM-DD-<topic>-design.md`

**Implementation (if continuing):**

- Ask: "Ready to set up for implementation?"
- Use the writing-plans skill to create a detailed implementation plan

---

## Output Contract

A complete brainstorming session must produce:

- Confirmed understanding of purpose, constraints, and success criteria
- 2-3 explored approaches with trade-offs and a clear recommendation
- Design document validated section by section with user confirmation
- Saved design file at `docs/plans/YYYY-MM-DD-<topic>-design.md`

If any of the above is missing, the session is not complete.

---

## Key Principles

- **One question at a time** — Don't overwhelm with multiple questions
- **Multiple choice preferred** — Easier to answer than open-ended when possible
- **YAGNI ruthlessly** — Remove unnecessary features from all designs
- **Explore alternatives** — Always propose 2-3 approaches before settling
- **Incremental validation** — Present design in sections, validate each
- **Minimal scope** — Focus on current task area, avoid sweeping the full codebase
- **Be flexible** — Go back and clarify when something doesn't make sense

---

Brainstorming compliance: design validated and documented
