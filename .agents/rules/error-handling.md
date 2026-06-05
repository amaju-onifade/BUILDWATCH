---
trigger: always_on
---

# Error Handling Rules — BuildWatch

## Two Categories of Error

Every error in BuildWatch falls into one of two categories. Handling them differently is mandatory.

| Category | Definition | Examples | Response |
|----------|-----------|---------|---------|
| **Operational** | Expected failures in correct code — part of normal system operation | Wrong password, expired invite, payment declined, file too large, Milestone not found | Return a structured error response. Log at `info` level if useful. Never alert. |
| **Programmer** | Unexpected failures indicating a bug or misconfiguration | `Cannot read property of undefined`, Prisma connection failure, missing env var, schema validation on internal data | Log at `error` level with full context. Alert if in production. |

**Rule:** Never expose programmer error details (stack traces, query errors, internal IDs) to the client. Return a generic `500` with a reference ID that can be correlated to server logs.

---

## Result Pattern (Business Logic Functions)

All `lib/` functions that can fail in expected ways must return a typed `Result<T>` — never throw operational errors.

```typescript
// src/lib/result.ts

export type Result<T, E = string> =
  | { ok: true; data: T }
  | { ok: false; error: E; code?: string }

export function ok<T>(data: T): Result<T> {
  return { ok: true, data }
}

export function err<T>(error: string, code?: string): Result<T> {
  return { ok: false, error, code }
}
```

### Usage in lib functions

```typescript
// src/modules/auth/lib/loginOwner.ts
import { ok, err, type Result } from '@/lib/result'

export async function loginOwner(
  email: string,
  password: string
): Promise<Result<{ userId: string; role: UserRole }>> {
  const user = await prisma.users.findUnique({ where: { email } })
  const dummyHash = '$2a$12$dummy.hash.to.prevent.timing.attacks.xxxxxxxxxx'
  const match = await compare(password, user?.passwordHash ?? dummyHash)

  if (!user || !match || user.deletedAt) {
    return err('Email or password is incorrect', 'INVALID_CREDENTIALS')
  }

  return ok({ userId: user.id, role: user.role as UserRole })
}
```

### Consuming Results in API handlers

```typescript
// In API handler:
const result = await loginOwner(email, password)

if (!result.ok) {
  return NextResponse.json(
    { error: result.error, code: result.code },
    { status: result.code === 'INVALID_CREDENTIALS' ? 401 : 400 }
  )
}

// result.data is now typed and safe to use
const { userId, role } = result.data
```

---

## Error Response Shape

All error responses from API routes use this exact shape. No deviations.

```typescript
// Operational error
{ "error": "Human-readable message safe to show the user", "code": "MACHINE_READABLE_CODE" }

// Validation error
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "issues": [{ "path": ["fieldName"], "message": "Required" }]
}

// Internal / programmer error (500)
{ "error": "Something went wrong", "requestId": "req_abc123" }
```

The `requestId` on 500 responses correlates to the server log entry. It is generated per-request and included in both the response and the log.

---

## Logging

BuildWatch uses structured JSON logging. All log entries include consistent metadata fields.

### Log Levels

| Level | When to use |
|-------|------------|
| `debug` | Dev-only verbose detail. Never committed with `debug` calls in production paths. |
| `info` | Normal operational events: user registered, submission created, report generated |
| `warn` | Recoverable anomalies: retry attempt, low GPS accuracy, rate limit approaching |
| `error` | Programmer errors, unhandled exceptions, integration failures requiring attention |

### Logger (`src/lib/logger.ts`)

```typescript
// src/lib/logger.ts

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  module?: string
  userId?: string
  projectId?: string
  requestId?: string
  error?: {
    message: string
    stack?: string
    code?: string
  }
  [key: string]: unknown
}

export function log(level: LogLevel, message: string, meta: Omit<LogEntry, 'level' | 'message'> = {}): void {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    ...meta,
  }
  // In production: send to log aggregator (e.g. Axiom, Logtail)
  // In development: pretty-print
  if (process.env.NODE_ENV === 'production') {
    process.stdout.write(JSON.stringify(entry) + '\n')
  } else {
    console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](
      `[${level.toUpperCase()}] ${message}`,
      Object.keys(meta).length ? meta : ''
    )
  }
}

export const logger = {
  debug: (msg: string, meta?: Omit<LogEntry, 'level' | 'message'>) => log('debug', msg, meta),
  info:  (msg: string, meta?: Omit<LogEntry, 'level' | 'message'>) => log('info', msg, meta),
  warn:  (msg: string, meta?: Omit<LogEntry, 'level' | 'message'>) => log('warn', msg, meta),
  error: (msg: string, meta?: Omit<LogEntry, 'level' | 'message'>) => log('error', msg, meta),
}
```

### Logging in API Handlers

```typescript
import { logger } from '@/lib/logger'

// ✅ Correct — structured, no PII in message, context in meta
logger.info('Submission created', {
  module: 'submissions',
  userId: session.userId,
  projectId: input.projectId,
  submissionId: submission.id,
})

logger.error('DeepSeek API call failed', {
  module: 'ai-analysis',
  submissionId,
  error: { message: err.message, stack: err.stack },
})

// ❌ Wrong — interpolated PII, no structure
console.log(`User ${email} submitted for project ${projectId}`)
```

### What Must Never Appear in Logs

- Passwords or password hashes
- JWT tokens or session cookies
- Full credit card numbers or CVVs
- GPS coordinates
- Flutterwave secret keys or webhook hashes
- Full photo storage keys (log the `submissionId` instead)
- Raw request bodies from the payment webhook

---

## API Route Error Handling Pattern

Every API route handler must follow this try/catch structure:

```typescript
// src/modules/submissions/api/create.ts
import { nanoid } from 'nanoid'
import { logger } from '@/lib/logger'

export async function handleCreateSubmission(
  req: NextRequest,
  session: SessionUser
): Promise<NextResponse> {
  const requestId = nanoid(10)

  try {
    // ... validation and business logic

    return NextResponse.json({ data: { id: submission.id } }, { status: 201 })

  } catch (err) {
    // Distinguish operational from programmer errors
    if (err instanceof Error && err.message === 'FORBIDDEN') {
      return NextResponse.json(
        { error: 'You do not have permission to perform this action', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    // Programmer/unexpected error — log with full context, return generic 500
    logger.error('Unhandled error in handleCreateSubmission', {
      module: 'submissions',
      requestId,
      userId: session.userId,
      error: { message: (err as Error).message, stack: (err as Error).stack },
    })

    return NextResponse.json(
      { error: 'Something went wrong', requestId },
      { status: 500 }
    )
  }
}
```

---

## React Error Boundaries

Client-side errors must be caught by Error Boundaries, not allowed to crash the full page.

```typescript
// src/components/ErrorBoundary.tsx
// NOTE: Lives in src/components/ — NOT src/components/ui/.
// It is a shared structural component, not a dumb UI primitive.
'use client'

import { Component, type ReactNode } from 'react'
import styles from './ErrorBoundary.module.css'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  module?: string
}

interface State { hasError: boolean; error?: Error }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // Log client-side errors to your error tracking service
    console.error(`[ErrorBoundary:${this.props.module}]`, error, info)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        // Use CSS class — never inline styles (see code-style.md)
        <div role="alert" className={styles.fallback}>
          <p className={styles.message}>Something went wrong loading this section.</p>
          <button className={styles.retry} onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
```

```css
/* src/components/ErrorBoundary.module.css */
.fallback {
  padding: var(--space-lg);
  text-align: center;
}

.message {
  color: var(--text-secondary);
  font-size: var(--text-body);
  margin-bottom: var(--space-md);
}

.retry {
  /* Uses the Ghost button style from design-system.md */
  background: transparent;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  padding: var(--space-sm) var(--space-md);
  cursor: pointer;
  color: var(--text-secondary);
}

.retry:hover {
  background: var(--surface-hover);
}
```

**Usage:** Wrap every major dashboard section and all Client Components that make API calls:

```tsx
<ErrorBoundary module="milestone-timeline" fallback={<MilestoneTimelineError />}>
  <MilestoneTimeline projectId={projectId} />
</ErrorBoundary>
```

---

## Async Background Jobs

For fire-and-forget tasks (AI report generation, email notifications), always attach a `.catch()` to prevent silent failures:

```typescript
// ✅ Correct — failure is logged, does not crash the parent flow
generateAnalysisReport({ submissionId, projectId, milestoneId })
  .catch(err =>
    logger.error('AI report generation failed silently', {
      module: 'ai-analysis',
      submissionId,
      error: { message: err.message },
    })
  )

// ❌ Wrong — unhandled promise rejection, crashes Node.js in some configs
generateAnalysisReport({ submissionId, projectId, milestoneId })
```

---

## External Service Failure Policy

| Service | Failure mode | Recovery |
|---------|-------------|---------|
| DeepSeek API | Retry 3× with exponential backoff. Mark report as `failed` after all retries. Owner sees "Analysis unavailable — please request again." | Manual re-trigger via owner UI |
| Flutterwave API | Retry webhook processing 3× via cron. Alert owner of payment issue by email. | Admin re-triggers or owner re-pays |
| Cloudflare R2 | Signed URL request fails → return 503 to client → client retries from offline queue | Automatic via offline queue |
| Resend (email) | Log failure, do not retry synchronously. Queue for async retry. | Background retry job |
| PostgreSQL | Surface as 503 Service Unavailable. Log with `error` level. | Database team / Supabase support |

---

## Rules Summary

- [ ] Business logic functions use `Result<T>` — they never throw operational errors
- [ ] API handlers have a top-level `try/catch` with structured logging on the `catch` path
- [ ] 500 responses include a `requestId` that correlates to the server log
- [ ] No stack traces, query errors, or internal IDs returned to clients
- [ ] No PII (email, GPS, passwords, tokens) in log messages
- [ ] All fire-and-forget async calls have `.catch()` with `logger.error`
- [ ] Client Components that make API calls are wrapped in `ErrorBoundary`
- [ ] External service failures follow the policy table above
