---
trigger: always_on
---

# Code Style Rules — BuildWatch

## TypeScript

- **Strict mode is on.** `tsconfig.json` has `"strict": true`. Never use `// @ts-ignore` or `any` to escape type errors — fix them.
- All function parameters and return types must be explicitly annotated when TypeScript cannot infer them unambiguously.
- Prefer `type` over `interface` for object shapes. Use `interface` only when you need declaration merging or `extends`.
- Use `z.infer<typeof Schema>` from Zod for all request body types — derive types from validators, never duplicate them.
- Enums are banned. Use `const` objects with `as const` and derive union types: `type Status = typeof STATUS[keyof typeof STATUS]`.
- No `namespace`. No `module`. No decorators (unless a library requires them).

```typescript
// ✅ Correct
const MILESTONE_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  LOCKED: 'locked',
} as const
type MilestoneStatus = typeof MILESTONE_STATUS[keyof typeof MILESTONE_STATUS]

// ❌ Wrong
enum MilestoneStatus { Pending, InProgress }
```

---

## Validation with Zod

All incoming data (API request bodies, form submissions, environment variables) must be validated with Zod before use.

```typescript
import { z } from 'zod'

const CreateSubmissionSchema = z.object({
  milestoneId: z.string().cuid(),
  caption: z.string().max(500).optional(),
  photos: z.array(z.string().url()).min(1).max(10),
  geoLat: z.number().min(-90).max(90).optional(),
  geoLng: z.number().min(-180).max(180).optional(),
})

type CreateSubmissionInput = z.infer<typeof CreateSubmissionSchema>
```

If validation fails, return `400 Bad Request` with `{ error: string, issues: ZodIssue[] }`.

---

## Error Handling

> **Authoritative source:** `.agents/rules/error-handling.md` is the full specification for error handling — logging levels, the `Result<T>` pattern, external service failure policy, and the `requestId` contract. This section captures the rules most relevant to day-to-day coding. When these two files conflict, `error-handling.md` wins.

- All async functions that can fail must use `try/catch`. Never let unhandled promise rejections reach the edge.
- Use a typed `Result` pattern for functions that can fail in expected ways:

```typescript
// src/lib/result.ts — import from here, do not redeclare locally
type Result<T, E = string> =
  | { ok: true; data: T }
  | { ok: false; error: E; code?: string }
```

- API routes return structured error responses:

```typescript
// ✅ Correct
return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })

// ❌ Wrong — exposes internals
return NextResponse.json({ error: err.message }, { status: 500 })
```

- Never leak database error messages, stack traces, or internal IDs to the client.
- Log errors server-side with structured metadata (module, action, userId if available).
- Every `500` response must include a `requestId` field that correlates to the server log entry — see `error-handling.md` for the full pattern.

---

## React and Next.js

- Prefer **Server Components** by default. Add `'use client'` only when the component needs interactivity, browser APIs, or React hooks.
- Server Actions use the `'use server'` directive and are placed in `modules/{module}/actions/`.
- No `useEffect` for data fetching. Use Server Components, SWR, or React Query.
- No `useEffect` with an empty dependency array as a "constructor" — find the right lifecycle primitive.
- All forms use controlled inputs. No uncontrolled form submission via `action=""` attribute in JSX.
- `key` props on lists must be stable IDs — never array indexes.

```typescript
// ✅ Correct
{milestones.map(m => <MilestoneRow key={m.id} milestone={m} />)}

// ❌ Wrong
{milestones.map((m, i) => <MilestoneRow key={i} milestone={m} />)}
```

---

## CSS and Styling

- BuildWatch uses a **bespoke CSS design system** — no Tailwind.
- All styles live in CSS modules (`ComponentName.module.css`) co-located with the component, or in global design-token files.
- Design tokens (colours, spacing, typography, radii) are defined as CSS custom properties in `src/styles/tokens.css`.
- No inline `style` props except for **truly dynamic values** — see definition below.
- No third-party CSS utility class libraries.

### Definition: "Truly Dynamic" Inline Style Values

An inline `style` prop is permitted **only** when the value is computed at render time from data and cannot be expressed as a static CSS class or CSS custom property override.

```tsx
// ✅ Allowed — percentage derived from runtime data, no static class can express this
<div style={{ width: `${completionPercent}%` }} />

// ✅ Allowed — CSS custom property set to a runtime value (preferred form)
<div style={{ '--progress': `${completionPercent}%` } as React.CSSProperties} />
// Then in CSS: .bar::after { width: var(--progress); }

// ❌ Not allowed — this is a fixed design token, use the CSS class
<div style={{ color: '#0F6D4E' }} />

// ❌ Not allowed — conditional styling belongs in CSS with data attributes
<div style={{ opacity: isDisabled ? 0.4 : 1 }} />
// Correct: <div data-disabled={isDisabled} /> with .el[data-disabled="true"] { opacity: 0.4 }
```

**Prefer the CSS custom property form** over a direct inline value whenever the value is consumed by a CSS rule — this keeps the styling logic in the stylesheet where it belongs.

---

## Database and Prisma

- Always use `select` or `include` explicitly — never return entire records when a subset is needed.
- Paginate all list queries. Default page size: 20. Maximum page size: 100.
- Use transactions (`prisma.$transaction`) whenever multiple writes must succeed or fail together.
- Write audit events inside the same transaction as the state change they record.

```typescript
// ✅ Correct — audit and state change are atomic
await prisma.$transaction([
  prisma.milestones.update({ where: { id }, data: { status: 'approved' } }),
  prisma.auditEvents.create({ data: { eventType: 'MILESTONE_APPROVED', ... } }),
])
```

---

## Naming Conventions

| Thing | Convention | Example |
|-------|-----------|---------|
| Variables / functions | camelCase | `getUserById`, `submissionCount` |
| React components | PascalCase | `MilestoneTimeline`, `PhotoCard` |
| Types / interfaces | PascalCase | `SubmissionPayload`, `UserRole` |
| Constants | UPPER_SNAKE | `MAX_PHOTOS_PER_SUBMISSION` |
| Database tables | snake_case (Prisma maps) | `audit_events`, `submission_photos` |
| CSS class names | kebab-case | `.milestone-card`, `.action-badge` |
| API routes | kebab-case | `/api/ai-reports`, `/api/audit-trail` |
| Env variables | UPPER_SNAKE | `FLW_CLIENT_ID`, `RESEND_API_KEY` |

---

## Comments and Documentation

- Code should be self-documenting. Prefer clear naming over explanatory comments.
- Write comments for **why**, not **what**. If the comment describes what the code does, the code probably needs a better name.
- Every exported function in `modules/{module}/lib/` must have a JSDoc comment describing its purpose, parameters, and return value.
- Mark intentional decisions with `// NOTE:` and deferred work with `// TODO(scope):`.

---

## Imports

- Absolute imports use the `@/` alias (`@/modules/submissions/lib/create`).
- Relative imports (`./`, `../`) are allowed only within the same module folder.
- Group imports: external libraries → internal modules → relative files. Separate groups with a blank line.
- No barrel exports (`index.ts`) in deeply nested folders — only at the module root.

---

## Testing

> **Authoritative source:** `.agents/rules/testing.md` is the full specification — test stack, required cases per file type, coverage thresholds, Prisma mock setup, and the list of critical flows that need end-to-end coverage. The summary below covers the rules most commonly needed during component and handler work. When these two files conflict, `testing.md` wins.

- Unit tests use Vitest. Integration tests use Vitest with a test database.
- Test files are co-located: `createSubmission.test.ts` next to `createSubmission.ts`.
- Every public function in `modules/{module}/lib/` must have at least a happy-path and an error-path test.
- Never mock Prisma with a manual mock — use `prisma-mock` or a seeded test database.
- No `console.log` in tests.
- No `.only` or `.skip` committed to the repository — these break CI coverage.
