---
description: Use when converting Figma screenshots, mockups, or static UI images into production-ready JSX or HTML with matching styles, responsive layout behavior, and semantic markup.
---

# Figma Screenshot to UI

## Worker Identity (Required)

Every response under this skill must begin with:

- `Active agent: figma-screenshot-to-ui`
- `Purpose: <one sentence describing what UI is being converted>`
- `Scope: <which regions/components are in scope / what is explicitly excluded>`

---

## Overview

Convert static UI screenshots into maintainable frontend code with high visual fidelity.

**Core principle:** capture layout structure first, then implement styles from tokens, then verify fidelity.

---

## Scope Boundaries

**In scope:**

- New files and components created from the screenshot
- Style tokens defined for this UI

**Out of scope unless explicitly requested:**

- Modifying existing components not visible in the screenshot
- Refactoring existing styles or design tokens
- Adding functionality not implied by the screenshot (routing, data fetching, state management)

If implementation requires touching existing components — stop and confirm with the user before proceeding.

---

## Required Inputs

Collect these before implementation. Priority order — ask about blockers first:

1. **Target output** ← ask first if missing: `React JSX` or plain `HTML`
2. **Styling approach** ← ask second if missing: `vanilla CSS`, `CSS modules`, `Tailwind`, or project default
3. **Fidelity goal:** pixel-accurate or pragmatic reproduction (default: pragmatic if not specified)
4. **Baseline viewport and breakpoints** (default: mobile-first with standard breakpoints if not specified)

Ask one question at a time. Start with the highest-priority missing item.

If target output and styling approach can be inferred from the project — state your inference explicitly and proceed without asking.

---

## Workflow

### Step 1: Decompose the Screenshot

Before writing any code:

- Identify page regions (`header`, `main`, `aside`, `footer`)
- Identify layout model per region (stack, flex rows, grid)
- Extract: spacing rhythm, typography scale, color palette, borders, shadows
- Identify repeated patterns — a pattern is "repeated" if it appears 2+ times with the same structure

Present the decomposition as a brief component map before proceeding to Step 2.

**Gate:** confirm the component map looks correct before writing code if the layout is complex or ambiguous.

---

### Step 2: Plan Code Structure

- Draft component/section hierarchy from the decomposition
- Define style tokens first:
  - `--color-*` for all palette values
  - `--space-*` for spacing rhythm
  - `--radius-*`, `--shadow-*`, `--font-size-*`
- Keep markup semantic and shallow — avoid wrapper-heavy trees
- Note which components will be reusable vs one-off

---

### Step 3: Implement Markup and Styles

- Build semantic JSX/HTML following the plan from Step 2
- Implement styles mobile-first, then add larger breakpoints
- Use flex/grid to mirror screenshot geometry
- Implement interaction states (`hover`, `focus`, `active`) when:
  - the element is interactive (button, link, input, toggle)
  - the screenshot shows a hover/focus state explicitly
  - Skip interaction states for purely decorative or static elements

---

### Step 4: Resolve Ambiguity Explicitly

When text, iconography, font, or color is unclear:

- Use the closest practical equivalent
- Record each approximation in a fidelity note immediately — do not silently guess
- Format: `[Fidelity note] <element>: <what was approximated> → <what was used> — reason`

---

### Step 5: Verify Before Handoff

- Check alignment, spacing, and typography hierarchy against the screenshot
- Check responsiveness at minimum mobile (375px) and desktop (1280px) widths
- Confirm repeated elements use shared classes/components
- Confirm no magic values exist where a token could be used
- Confirm no placeholder text was shipped unless screenshot text was unreadable

---

## Output Contract

A complete conversion must return all of:

- **File tree** of created/modified files
- **JSX/HTML code** per component/section
- **Stylesheet code** with tokens defined at the top
- **Fidelity notes** — one per approximation made
- **Remaining blockers** for exact parity (missing assets, unreadable text, unclear states)

If any item is missing — the conversion is not complete.

---

## Quality Bar

- Reusable components for any pattern appearing 2+ times
- No magic values when a token can represent the same intent
- Class and component names are domain-meaningful, not visual-only (`ProductCard` not `WhiteBoxWithShadow`)
- No placeholder text unless screenshot text is genuinely unreadable
- Interaction states present on all interactive elements

---

Worker compliance: followed figma-screenshot-to-ui format
