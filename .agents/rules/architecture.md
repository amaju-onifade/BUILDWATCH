---
trigger: always_on
---

# Architecture Rules — BuildWatch

## Module Structure

The application is organised by **business domain**, not by file type. Every feature lives in its own module under `src/modules/`. Modules contain their own components, API route handlers, server actions, types, and data-access logic.

```
src/
  modules/
    {module-name}/
      components/       # UI components scoped to this module
      actions/          # Next.js Server Actions
      api/              # API route handlers (used by App Router route.ts files)
      lib/              # Pure business logic — no Next.js imports
      types.ts          # TypeScript types for this module
      index.ts          # Public exports only
  app/
    api/
      {route}/
        route.ts        # Thin shell — imports handler from modules/{module}/api/
  components/
    ui/                 # Shared design-system primitives only
  lib/
    db.ts               # Prisma client singleton
    auth.ts             # Session helpers
    config.ts           # Env var validation — fails loudly on missing vars
    result.ts           # Shared Result<T> type and ok/err helpers
    logger.ts           # Structured JSON logger
    encryption.ts       # AES-256-GCM helpers for GPS coordinates
```

> **Note on Flutterwave helpers:** `src/lib/flutterwave.ts` holds only the OAuth token manager (singleton, shared utility). All Flutterwave business logic — checkout initiation, subscription state, webhook processing — lives in `src/modules/payments/`. The token manager is in `lib/` because it is a low-level credential helper with no business logic, analogous to `db.ts`.

**Rule:** `app/api/**/route.ts` files must be thin shells. All logic belongs in `modules/{module}/api/`. A route.ts file that is longer than 10 lines almost certainly contains misplaced logic.

---

## Domain Boundaries

Cross-module imports follow these rules:

- ✅ A module may import from `src/lib/` (shared utilities)
- ✅ A module may import from `src/components/ui/` (shared primitives)
- ✅ A module may import `types.ts` from another module
- ❌ A module must never import business logic (`lib/`, `api/`, `actions/`) from another module
- ❌ The `ai-analysis` module must not contain notification logic
- ❌ The `payments` module must not contain milestone or submission logic

If two modules need to communicate, they do so through:
1. A shared type in the importing module's `types.ts`
2. A database query (never a direct function call across module boundaries)
3. A background job / event (for async cross-module side effects)

---

## Prisma and Database

- The Prisma client is a singleton at `src/lib/db.ts`. Never instantiate `PrismaClient` anywhere else.
- All database queries live in `modules/{module}/lib/` — never inline in route handlers or components.
- Raw SQL (`$queryRaw`, `$executeRaw`) is prohibited without a security review comment explaining why it is safe.
- Migrations are created with `prisma migrate dev --name descriptive-name`. Never edit migration files after they have been applied.
- The `AuditEvents` table is append-only. No update or delete queries against it — ever.

---

## API Route Conventions

Every API route must follow this structure:

```typescript
// app/api/submissions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { handleCreateSubmission } from '@/modules/submissions/api/create'

export async function POST(req: NextRequest) {
  const session = await requireRole(req, ['proxy', 'contractor'])
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return handleCreateSubmission(req, session)
}
```

Rules:
- Every route calls `requireRole` before any other logic
- `requireRole` must return `null` on failure — never throw
- On auth failure, always return `403 Forbidden`, never `404`
- Input validation happens inside the module handler, not in route.ts
- Error responses always use the shape `{ error: string, code?: string }`

---

## Component Architecture

```
src/
  components/
    ui/                 # Primitives: Button, Input, Card, Badge, Modal — no business logic
    ErrorBoundary.tsx   # Shared error boundary — see usage rules below
  modules/
    {module}/
      components/       # Smart components — connect to server actions or fetchers
```

Rules:
- `components/ui/` components are dumb — they accept props and render. No `useState` that affects business state, no API calls.
- Module components may be Server Components or Client Components as needed. Prefer Server Components for data-fetching.
- Client Components that fetch data must use SWR or React Query — never raw `useEffect` + `fetch`.
- No `dangerouslySetInnerHTML` anywhere in the codebase.

### Error Boundary Placement

Every major dashboard section and every Client Component that makes API calls must be wrapped in `<ErrorBoundary>`. This prevents a single component failure from crashing the full page.

```tsx
// Wrap each independent section at the page level
<ErrorBoundary module="milestone-timeline" fallback={<MilestoneTimelineError />}>
  <MilestoneTimeline projectId={projectId} />
</ErrorBoundary>

<ErrorBoundary module="ai-report-panel">
  <AIReportPanel submissionId={submissionId} />
</ErrorBoundary>
```

**Placement rules:**
- Owner dashboard: each panel (milestone list, photo grid, AI report, activity log) gets its own boundary
- Proxy submission flow: the photo uploader and submission form each get their own boundary
- Never nest Error Boundaries inside each other at the same DOM level
- The `module` prop is mandatory — it appears in the client-side error log

---

## File Naming

| Pattern | Convention |
|---------|-----------|
| React components | `PascalCase.tsx` |
| Utility functions | `camelCase.ts` |
| API handlers | `camelCase.ts` inside `modules/{module}/api/` |
| Server actions | `camelCase.ts` inside `modules/{module}/actions/` |
| Types | `camelCase.ts` or `types.ts` |
| Test files | `{filename}.test.ts` co-located with the file |

---

## Folder Ownership

| Module | Owns |
|--------|------|
| `auth` | Session, JWT, invite links, role assignment |
| `projects` | Project CRUD, member relationships, health score |
| `milestones` | Milestone state machine, budget allocation, approval |
| `submissions` | Photo upload, geotag, offline queue, compression |
| `ai-analysis` | DeepSeek prompt, report parsing, storage, retry |
| `notifications` | Scheduler, push, email, digest, silence alert |
| `audit-trail` | Immutable event writes, PDF export |
| `inspectors` | Interest registration, listing (post-MVP booking) |
| `payments` | Flutterwave integration, trial logic, subscription state |

No module may reach into another module's folder to read or write data. Use the public `index.ts` exports only.

---

## Environment and Configuration

- Environment config lives in `.env.local` (development) and Vercel project settings (production/preview).
- Never commit `.env`, `.env.local`, or `.env.production` to the repository.
- A config helper at `src/lib/config.ts` reads and validates all env vars at startup. If a required variable is missing, the app must fail with a clear error message — not silently fall back.
- The `NEXT_PUBLIC_` prefix is reserved for values safe to expose to the browser. No credential or secret may use this prefix.

### `src/lib/config.ts` — Required Stub

This file must exist and be imported by `src/lib/db.ts` and any module that consumes env vars at startup. It throws at import time if a required variable is absent.

```typescript
// src/lib/config.ts
function require(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `[config] Missing required environment variable: ${name}. ` +
      `Check .env.local (development) or Vercel project settings (production).`
    )
  }
  return value
}

export const config = {
  // Database
  databaseUrl:        require('DATABASE_URL'),

  // Auth
  jwtSecret:          require('JWT_SECRET'),

  // Flutterwave
  flwClientId:        require('FLW_CLIENT_ID'),
  flwClientSecret:    require('FLW_CLIENT_SECRET'),
  flwSecretHash:      require('FLW_SECRET_HASH'),

  // DeepSeek
  deepseekApiKey:     require('DEEPSEEK_API_KEY'),

  // Cloudflare R2
  r2AccountId:        require('R2_ACCOUNT_ID'),
  r2AccessKeyId:      require('R2_ACCESS_KEY_ID'),
  r2SecretAccessKey:  require('R2_SECRET_ACCESS_KEY'),
  r2BucketName:       require('R2_BUCKET_NAME'),

  // Email
  resendApiKey:       require('RESEND_API_KEY'),

  // App
  appUrl:             require('NEXT_PUBLIC_APP_URL'),
} as const
```

**Rule:** Individual modules must import from `@/lib/config` — never from `process.env` directly. This ensures missing variables are caught at startup, not at runtime when a code path is first executed.

---

## PWA and Offline

- The service worker manages the offline submission queue.
- The offline queue is stored in IndexedDB (not localStorage).
- Background sync retries every 60 seconds when connectivity returns.
- The proxy submission path (`/api/submissions`) must never have a required dependency on a third-party service being available at the time of capture.

### Service Worker Registration Strategy

Next.js does not register service workers automatically. BuildWatch uses a custom SW at `public/sw.js` (or compiled to that path by the build step).

**Registration location:** `src/components/ServiceWorkerRegistrar.tsx` — a Client Component mounted once at the layout level.

```tsx
// src/components/ServiceWorkerRegistrar.tsx
'use client'
import { useEffect } from 'react'

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then(reg => {
          // NOTE: Check for updates on every page load
          reg.update().catch(() => {}) // silent — offline may block this
        })
        .catch(err => {
          // Non-fatal — app works without SW, just loses offline capability
          console.warn('[sw] Registration failed:', err)
        })
    }
  }, [])

  return null
}
```

**Mount in the root layout — proxy layout only:**

```tsx
// src/app/(proxy)/layout.tsx
import { ServiceWorkerRegistrar } from '@/components/ServiceWorkerRegistrar'

export default function ProxyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ServiceWorkerRegistrar />
      {children}
    </>
  )
}
```

**Rules:**
- Register the SW only on the proxy layout — the owner dashboard does not need offline capability
- The SW file itself lives in `public/sw.js` so Next.js serves it from the root scope
- SW registration failure must never break the submission flow — catch and warn only
- The SW scope must be `/` to intercept all API calls from the proxy routes
