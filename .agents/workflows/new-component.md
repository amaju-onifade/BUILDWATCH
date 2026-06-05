---
description: 
---

# Workflow: New Component

Use this checklist every time you create a new React component.

---

## Pre-Work

- [ ] Read `.agents/rules/architecture.md` — confirm the component belongs in the right folder
- [ ] Read `.agents/rules/code-style.md` — confirm styling and TypeScript patterns
- [ ] Read `skills/component-builder/SKILL.md` — full component creation playbook

---

## Step 1 — Classify

Answer these before touching any file:

- Is this a **shared UI primitive** (Button, Input, Modal) or a **domain component** (MilestoneCard, SubmissionGrid)?
  - Primitive → `src/components/ui/`
  - Domain → `src/modules/{module}/components/`

- Does it need `useState`, `useEffect`, `useRef`, or any browser API?
  - Yes → add `'use client'` at the top
  - No → Server Component (no directive)

---

## Step 2 — Create Files

Create exactly these three files (no more, no less):

```
{target-folder}/
  ComponentName.tsx
  ComponentName.module.css
  ComponentName.test.tsx
```

---

## Step 3 — Write the Component

Follow the template in `skills/component-builder/SKILL.md`.

Key rules to apply while writing:

- [ ] Props interface is named `{ComponentName}Props` and is explicitly typed
- [ ] `key` props use stable IDs, never array indexes
- [ ] No `useEffect` for data fetching — use Server Component or SWR
- [ ] No `dangerouslySetInnerHTML`
- [ ] No inline `style` props (except dynamic computed values)
- [ ] Error states render with `role="alert"`
- [ ] Loading states set `aria-busy="true"` on the container

---

## Step 4 — Write the Styles

```css
/* ComponentName.module.css */

/* Use tokens from tokens/theme-tokens.css — never hardcode values */
.root {
  padding: var(--space-lg);      /* 16px — from spacing scale */
  background: var(--color-surface);
  border-radius: var(--radius-md); /* 8px */
}

/* Typography pairing */
.title {
  font-size: var(--typography-title-medium-font-size);
  line-height: var(--typography-title-medium-line-height);
  font-weight: var(--typography-title-medium-font-weight);
}
```

- [ ] All colours use `var(--color-*)` tokens
- [ ] All spacing uses `var(--space-*)` tokens
- [ ] All typography uses `var(--typography-*)` tokens (pair font-size with line-height)
- [ ] All radii use `var(--radius-*)` tokens
- [ ] No magic numbers for size, spacing, or colour

---

## Step 5 — Write the Tests

Minimum required tests:

```typescript
// ComponentName.test.tsx
import { render, screen } from '@testing-library/react'
import { ComponentName } from './ComponentName'

describe('ComponentName', () => {
  it('renders without crashing', () => {
    render(<ComponentName {/* required props */} />)
    // assert something visible is in the document
  })

  it('shows error state when provided', () => {
    // test error rendering if applicable
  })

  it('shows loading state while fetching', () => {
    // test loading rendering if applicable
  })
})
```

---

## Step 6 — Accessibility Check

Before submitting, manually verify:

- [ ] Tab through the component — all interactive elements are reachable
- [ ] Buttons have visible labels (text or `aria-label`)
- [ ] Images have `alt` attributes
- [ ] Form inputs have associated `<label>` elements
- [ ] Error messages are announced (use `role="alert"`)

---

## Step 7 — Final Checklist

- [ ] Component file created in correct folder
- [ ] `'use client'` present only if needed
- [ ] Props interface typed
- [ ] `.module.css` file created and uses only design tokens
- [ ] `.test.tsx` file created with at least a render test
- [ ] No hardcoded colours, spacing, or font sizes
- [ ] Accessibility requirements met
- [ ] Component exported from the module's `index.ts` (if domain component)
