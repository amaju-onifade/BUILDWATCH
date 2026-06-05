---
description: 
---

# Workflow: New API Route

Use this checklist every time you create a new API route.

---

## Pre-Work

- [ ] Read `.agents/rules/architecture.md` — understand the thin-shell pattern
- [ ] Read `.agents/rules/security.md` — RBAC, ownership checks, input validation
- [ ] Read `skills/api-route-scaffolder/SKILL.md` — full route creation playbook
- [ ] If the route involves payments: read `skills/flutterwave-integration/SKILL.md`
- [ ] If the route changes the database schema: read `skills/db-migration-runner/SKILL.md`

---

## Step 1 — Design the Route

Write out the spec before touching any file:

```
Route:       POST /api/submissions
Module:      submissions
Roles:       proxy
Ownership:   proxy must be assigned to the project
Input:       { milestoneId, photos[], caption?, geoLat?, geoLng? }
Success:     201 { data: { id } }
Errors:      400 validation, 403 forbidden, 500 internal
Side effects: AuditEvent created, notification queued
```

---

## Step 2 — Create Files

```
app/api/{resource}/route.ts                      ← shell
src/modules/{module}/api/{action}.ts             ← handler
src/modules/{module}/api/{action}.test.ts        ← tests
```

If it has a dynamic segment:
```
app/api/{resource}/[id]/route.ts
src/modules/{module}/api/{action}ById.ts
```

---

## Step 3 — Write the Shell (`app/api/.../route.ts`)

```typescript
import { NextRequest } from 'next/server'
import { requireRole } from '@/lib/auth'
import { handleXxx } from '@/modules/{module}/api/{action}'

export async function POST(req: NextRequest) {
  const session = await requireRole(req, ['proxy'])
  if (!session) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
  return handleXxx(req, session)
}
```

Rules:
- [ ] Shell is ≤ 10 lines
- [ ] `requireRole` is the first call — no logic before it
- [ ] Returns `403` on auth failure, not `401` or `404`

---

## Step 4 — Write the Handler (`src/modules/{module}/api/{action}.ts`)

Follow the template in `skills/api-route-scaffolder/SKILL.md`.

Key rules:

- [ ] Zod schema defined and exported at the top of the file
- [ ] `safeParse` used (not `parse`) — returns structured validation errors
- [ ] Ownership confirmed by querying the database (not trusting client input)
- [ ] Response uses standard shape: `{ data: ... }` or `{ error: ... }`
- [ ] No database error messages returned to the client
- [ ] `AuditEvents` row created for any state-changing operation
- [ ] List endpoints paginated (default 20, max 100)

---

## Step 5 — Write the Tests

Minimum required tests:

```typescript
// {action}.test.ts
describe('handleXxx', () => {
  it('returns 201 and creates the resource on valid input', async () => { })
  it('returns 400 on invalid input', async () => { })
  it('returns 403 if user does not own the resource', async () => { })
  it('returns 403 if role is not permitted', async () => { })
  it('is idempotent / handles duplicate calls gracefully', async () => { })
})
```

---

## Step 6 — Payment Routes Only

If this route touches Flutterwave, additionally verify:

- [ ] `skills/flutterwave-integration/SKILL.md` has been read in full
- [ ] Webhook route verifies signature with `timingSafeEqual` before any processing
- [ ] Checkout route stores `tx_ref` in the database before redirecting
- [ ] Transaction is verified via Flutterwave API before granting access
- [ ] Webhook handler is idempotent (duplicate event check in place)
- [ ] No Flutterwave credential appears in any `NEXT_PUBLIC_` variable

---

## Step 7 — Final Checklist

- [ ] Shell file is ≤ 10 lines, in `app/api/`
- [ ] Handler file is in `src/modules/{module}/api/`
- [ ] `requireRole` and ownership check both present
- [ ] Zod validation on all inputs
- [ ] Standard response shapes used
- [ ] Correct HTTP status codes
- [ ] `AuditEvents` created for mutations
- [ ] Pagination on list routes
- [ ] Test file created with happy path + error paths
- [ ] No secrets, credentials, or internal error details in responses
