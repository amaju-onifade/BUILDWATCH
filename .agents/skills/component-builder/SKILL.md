# Skill: Component Builder

**Applies to:** Any task that creates a new React component or modifies an existing one.  
**Read this entire file before writing any component code.**

---

## Step 1 — Classify the Component

Before writing anything, answer these two questions:

**Q1: Does this component need browser APIs, event handlers, or React hooks (`useState`, `useEffect`, etc.)?**
- Yes → Client Component (`'use client'` at top of file)
- No → Server Component (no directive needed — this is the Next.js default)

**Q2: Does this component belong to a specific domain?**
- Yes → `src/modules/{module}/components/ComponentName.tsx`
- No (shared primitive like Button, Input, Card) → `src/components/ui/ComponentName.tsx`

---

## Step 2 — File and Folder Structure

```
src/modules/{module}/components/
  ComponentName.tsx          ← component logic
  ComponentName.module.css   ← scoped styles (always co-located)
  ComponentName.test.tsx     ← tests (always co-located)
```

For shared UI primitives:
```
src/components/ui/
  Button.tsx
  Button.module.css
  Button.test.tsx
```

---

## Step 3 — Component Template

### Server Component (no directive)

```typescript
// src/modules/milestones/components/MilestoneTimeline.tsx
import { getMilestonesForProject } from '@/modules/milestones/lib/getMilestones'
import styles from './MilestoneTimeline.module.css'

interface MilestoneTimelineProps {
  projectId: string
}

export async function MilestoneTimeline({ projectId }: MilestoneTimelineProps) {
  const milestones = await getMilestonesForProject(projectId)

  return (
    <section className={styles.timeline}>
      {milestones.map(m => (
        <div key={m.id} className={styles.item}>
          <span className={styles.label}>{m.name}</span>
          <span className={styles.status} data-status={m.status}>
            {m.status}
          </span>
        </div>
      ))}
    </section>
  )
}
```

### Client Component

```typescript
'use client'
// src/modules/submissions/components/PhotoUploader.tsx
import { useState, useCallback } from 'react'
import { compressPhoto } from '@/modules/submissions/lib/compress'
import styles from './PhotoUploader.module.css'

interface PhotoUploaderProps {
  milestoneId: string
  onUploadComplete: (photoUrls: string[]) => void
}

export function PhotoUploader({ milestoneId, onUploadComplete }: PhotoUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFiles = useCallback(async (files: FileList) => {
    setUploading(true)
    setError(null)
    try {
      // Compress before upload — mandatory, max 400 KB
      const compressed = await Promise.all(
        Array.from(files).map(f => compressPhoto(f))
      )
      // ... upload logic
      onUploadComplete([])
    } catch (err) {
      setError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }, [milestoneId, onUploadComplete])

  return (
    <div className={styles.uploader}>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {/* ... */}
    </div>
  )
}
```

---

## Step 4 — Styling Rules

- Every component gets its own `.module.css` file. No exceptions.
- Use CSS custom properties from `src/styles/tokens.css` for all colours, spacing, and typography.
- Never use inline `style` props except for truly dynamic computed values.
- Never use Tailwind utility classes. BuildWatch uses a bespoke design system.
- Class names use kebab-case: `.milestone-card`, `.action-badge`.

```css
/* MilestoneTimeline.module.css */
/* NOTE: All token names come from tokens/theme-tokens.css — read that file
   before adding new tokens. Never invent token names or hardcode values. */
.timeline {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);        /* 8px — from spacing scale */
}

.item {
  display: flex;
  justify-content: space-between;
  padding: var(--space-sm) var(--space-md);  /* 8px 16px */
  background: var(--color-surface);
  border-radius: var(--radius-sm);
}

.status[data-status="approved"] {
  color: var(--color-success);
}

.status[data-status="under_review"] {
  color: var(--color-warning);
}
```

---

## Step 5 — Accessibility Requirements

Every component must meet these baseline requirements:

- Interactive elements (`button`, `a`, custom controls) must have accessible labels.
- Use semantic HTML. `<button>` for actions, `<a>` for navigation, `<section>` / `<article>` / `<nav>` for layout.
- Error messages use `role="alert"` so screen readers announce them.
- Loading states include visible feedback and an `aria-busy` attribute on the relevant container.
- Never use `onClick` on a non-interactive element (`div`, `span`) — use `<button>` with appropriate styling instead.
- Images require descriptive `alt` text. Decorative images use `alt=""`.
- Form inputs must have associated `<label>` elements (not just placeholders).

---

## Step 6 — Data Fetching Rules

| Pattern | Allowed? | Notes |
|---------|---------|-------|
| `async/await` in Server Component | ✅ | Preferred for static or per-request data |
| SWR in Client Component | ✅ | For data that needs client-side revalidation |
| React Query in Client Component | ✅ | For complex mutation/cache scenarios |
| `useEffect` + `fetch` | ❌ | Never — use SWR or React Query |
| Fetching in `useLayoutEffect` | ❌ | Never |

---

## Step 7 — Role-Based Rendering

Components that render sensitive data must check the user's role. Never rely on hiding elements as a security measure — the check must also be enforced server-side in the API route.

```typescript
// In a Server Component:
import { getSession } from '@/lib/auth'

export async function AIReportPanel({ projectId }: { projectId: string }) {
  const session = await getSession()
  if (session?.role !== 'owner') return null // render nothing for non-owners
  // ... render the report
}
```

---

## Step 8 — Checklist Before Submitting

- [ ] Component is in the correct folder (module-scoped or `ui/`)
- [ ] `'use client'` present only if hooks or browser APIs are used
- [ ] Props are fully typed with explicit TypeScript interface
- [ ] Co-located `.module.css` file created
- [ ] All CSS token names verified against `tokens/theme-tokens.css` — no guessed or hardcoded values
- [ ] All interactive elements are accessible (labels, roles, keyboard-navigable)
- [ ] No `useEffect` used for data fetching — use Server Components, SWR, or React Query
- [ ] If component renders sensitive data (AI reports, GPS, billing), role check is present server-side — not just hidden in the UI
- [ ] Co-located `.test.tsx` file created with at least a render test and error state test
- [ ] No inline styles except truly dynamic computed values (see `code-style.md` for definition)
- [ ] `key` props use stable IDs, not array indexes
