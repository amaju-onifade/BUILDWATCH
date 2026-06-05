# Skill: API Route Scaffolder

**Applies to:** Any task that creates a new Next.js API route.  
**Read this entire file before writing any route code.**

---

## Step 1 — Understand the Route's Responsibility

Before writing anything, answer:

1. What HTTP method(s) does this route handle? (`GET` / `POST` / `PUT` / `PATCH` / `DELETE`)
2. What module does this route belong to? (projects, submissions, payments, etc.)
3. What roles may access it?
4. What does the request body / query string look like?
5. What does the response look like on success? On error?

Write out these answers as comments at the top of the handler file before coding.

---

## Step 2 — File Locations

```
app/
  api/
    {resource}/
      route.ts                 ← thin shell only (≤ 10 lines of logic)
      [id]/
        route.ts               ← for routes with a dynamic segment

src/modules/{module}/
  api/
    {action}.ts                ← full handler logic lives here
```

**Rule:** `app/api/**/route.ts` is a thin shell. All validation, business logic, and database calls belong in `src/modules/{module}/api/{action}.ts`.

---

## Step 3 — Shell Template (`app/api/.../route.ts`)

```typescript
// app/api/submissions/route.ts
import { NextRequest } from 'next/server'
import { requireRole } from '@/lib/auth'
import { handleCreateSubmission } from '@/modules/submissions/api/create'
import { handleListSubmissions } from '@/modules/submissions/api/list'

export async function POST(req: NextRequest) {
  const session = await requireRole(req, ['proxy'])
  if (!session) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
  return handleCreateSubmission(req, session)
}

export async function GET(req: NextRequest) {
  const session = await requireRole(req, ['owner', 'proxy', 'contractor'])
  if (!session) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
  return handleListSubmissions(req, session)
}
```

---

## Step 4 — Handler Template (`src/modules/{module}/api/{action}.ts`)

```typescript
// src/modules/submissions/api/create.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import type { SessionUser } from '@/lib/auth'

// 1. Define and export the input schema
export const CreateSubmissionSchema = z.object({
  milestoneId: z.string().cuid(),
  caption: z.string().max(500).optional(),
  photos: z.array(z.string().url()).min(1).max(10),
  geoLat: z.number().min(-90).max(90).optional(),
  geoLng: z.number().min(-180).max(180).optional(),
})

export type CreateSubmissionInput = z.infer<typeof CreateSubmissionSchema>

// 2. Handler function
export async function handleCreateSubmission(
  req: NextRequest,
  session: SessionUser
): Promise<NextResponse> {
  // 3. Parse and validate body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const result = CreateSubmissionSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: result.error.issues },
      { status: 400 }
    )
  }

  const input = result.data

  // 4. Confirm the proxy is assigned to the relevant milestone's project
  const milestone = await prisma.milestones.findFirst({
    where: {
      id: input.milestoneId,
      project: { proxyId: session.userId },
    },
    select: { id: true, projectId: true },
  })

  if (!milestone) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 5. Execute business logic — submission + audit event must be atomic.
  // Use the interactive $transaction form so submission.id is available
  // for the audit event within the same transaction boundary.
  const submission = await prisma.$transaction(async (tx) => {
    const sub = await tx.submissions.create({
      data: {
        milestoneId: milestone.id,
        projectId: milestone.projectId,
        proxyId: session.userId,
        caption: input.caption ?? null,
        geoLat: input.geoLat ?? null,
        geoLng: input.geoLng ?? null,
      },
    })

    await tx.auditEvents.create({
      data: {
        eventType: 'SUBMISSION_CREATED',
        actorId: session.userId,
        resourceId: sub.id,
        resourceType: 'submission',
        projectId: milestone.projectId,
      },
    })

    return sub
  })

  // 6. Return success
  return NextResponse.json({ data: { id: submission.id } }, { status: 201 })
}
```

---

## Step 5 — Standard Response Shapes

All routes must return JSON in one of these shapes:

**Success (single resource):**
```json
{ "data": { "id": "...", "..." } }
```

**Success (collection):**
```json
{
  "data": [ { "id": "...", "..." } ],
  "pagination": { "page": 1, "pageSize": 20, "total": 47 }
}
```

**Error:**
```json
{ "error": "Human-readable message", "code": "OPTIONAL_MACHINE_CODE" }
```

**Validation error:**
```json
{
  "error": "Validation failed",
  "issues": [ { "path": ["fieldName"], "message": "..." } ]
}
```

---

## Step 6 — HTTP Status Code Guide

| Scenario | Status |
|----------|--------|
| Resource created | `201 Created` |
| Successful read / update | `200 OK` |
| Request accepted (async processing) | `202 Accepted` |
| Missing / invalid auth | `401 Unauthorized` |
| Valid auth, wrong role or no ownership | `403 Forbidden` |
| Resource not found | `404 Not Found` |
| Validation failure | `400 Bad Request` |
| Internal error | `500 Internal Server Error` |
| Rate limited | `429 Too Many Requests` |

**Rule:** Never return `404` for auth failures. Use `403`. Returning `404` leaks information about whether a resource exists.

---

## Step 7 — Pagination

All list endpoints must support pagination via query params:

```typescript
const page = Number(req.nextUrl.searchParams.get('page') ?? '1')
const pageSize = Math.min(
  Number(req.nextUrl.searchParams.get('pageSize') ?? '20'),
  100
)
const skip = (page - 1) * pageSize

const [items, total] = await prisma.$transaction([
  prisma.submissions.findMany({ skip, take: pageSize, where: { ... } }),
  prisma.submissions.count({ where: { ... } }),
])

return NextResponse.json({
  data: items,
  pagination: { page, pageSize, total },
})
```

---

## Step 8 — Route Checklist Before Submitting

- [ ] `app/api/.../route.ts` is ≤ 10 lines of logic (thin shell only)
- [ ] Handler lives in `src/modules/{module}/api/{action}.ts`
- [ ] `requireRole` called at the top of every route export
- [ ] Role check AND ownership check performed
- [ ] Request body validated with Zod before use
- [ ] Query params validated if present
- [ ] Response uses standard shape `{ data: ... }` or `{ error: ... }`
- [ ] Correct HTTP status codes used
- [ ] `AuditEvents` row created for any state-changing action
- [ ] No database error messages, stack traces, or internal IDs returned to client
- [ ] Pagination applied to all list endpoints
- [ ] Handler function has a corresponding test file at `{action}.test.ts`
