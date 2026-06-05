---
description: 
---

# Workflow: New DB Model

Use this checklist every time you add a completely new domain model — a new Prisma model, its migration, data-access library, and audit integration.

---

## Pre-Work

Read all of these before touching any file:

- [ ] `.agents/rules/architecture.md` — module ownership, Prisma singleton rules
- [ ] `.agents/rules/code-style.md` — naming conventions, transaction patterns
- [ ] `.agents/rules/security.md` — append-only constraints, what can never be deleted
- [ ] `.agents/rules/error-handling.md` — Result pattern, logging
- [ ] `.agents/rules/testing.md` — test file requirements
- [ ] `skills/db-migration-runner/SKILL.md` — full migration playbook

---

## Step 1 — Design the Model

Write out the full spec before opening any file:

```
Model name (Prisma PascalCase):
Table name (snake_case, @@map):
Module it belongs to:
Primary key: cuid()
Foreign keys and relations:
Is this append-only? (Y/N — if Y, no update or delete operations ever)
Soft delete needed? (deletedAt DateTime?)
Indexes required:
Fields and types:
```

---

## Step 2 — Add to `schema.prisma`

Follow the model template from `skills/db-migration-runner/SKILL.md`.

Checklist:
- [ ] `id String @id @default(cuid())`
- [ ] `createdAt DateTime @default(now())`
- [ ] `updatedAt DateTime @updatedAt` (omit only if append-only)
- [ ] `deletedAt DateTime?` (if soft delete needed)
- [ ] `@@map("snake_case_table_name")`
- [ ] All relations defined with explicit `onDelete` behaviour
- [ ] `@@index()` on every foreign key and every field used in `WHERE` clauses
- [ ] Relation fields added to the related models

---

## Step 3 — Create and Apply the Migration

```bash
npx prisma migrate dev --name add_{table_name}_table
```

- [ ] Review the generated SQL in `prisma/migrations/` — confirm it contains exactly the intended changes and nothing else
- [ ] If the migration adds a non-nullable column to an existing table with rows, follow the two-step nullable → backfill → non-nullable pattern from `skills/db-migration-runner/SKILL.md`
- [ ] Run `npx prisma generate` after migration

---

## Step 4 — Create the Data Access Library

Create `src/modules/{module}/lib/{modelName}.ts` with typed query functions.

Every data-access file must expose exactly these function shapes as needed:

```typescript
// src/modules/{module}/lib/{modelName}.ts
import { prisma } from '@/lib/db'
import { ok, err, type Result } from '@/lib/result'

// CREATE
export async function create{ModelName}(
  input: Create{ModelName}Input
): Promise<Result<{ModelName}>> { ... }

// READ single
export async function get{ModelName}ById(
  id: string,
  requestingUserId: string   // always pass — used for ownership check
): Promise<Result<{ModelName} | null>> { ... }

// READ list (always paginated)
export async function list{ModelName}s(params: {
  projectId: string
  requestingUserId: string
  page?: number
  pageSize?: number
}): Promise<Result<{ items: {ModelName}[]; total: number }>> { ... }

// UPDATE (only if not append-only)
export async function update{ModelName}(
  id: string,
  input: Update{ModelName}Input,
  requestingUserId: string
): Promise<Result<{ModelName}>> { ... }

// SOFT DELETE (only if deletedAt exists — never hard delete)
export async function delete{ModelName}(
  id: string,
  requestingUserId: string
): Promise<Result<void>> { ... }
```

Rules:
- [ ] All functions return `Result<T>` — never throw operational errors
- [ ] Every function that reads or mutates a record re-queries ownership before acting
- [ ] `select` fields explicitly — never return full records when a subset suffices
- [ ] List functions are always paginated (default 20, max 100)
- [ ] Mutations use `prisma.$transaction` when they touch more than one table

---

## Step 5 — Add Audit Events

Every state-changing operation on the new model must write an `AuditEvent` in the same transaction.

```typescript
// Inside the $transaction:
await tx.auditEvents.create({
  data: {
    eventType: '{MODEL_NAME}_CREATED',   // or _UPDATED, _DELETED, _APPROVED etc.
    actorId: requestingUserId,
    resourceId: newRecord.id,
    resourceType: '{modelName}',
    projectId: input.projectId,          // null if not project-scoped
  },
})
```

Define all event type strings for the new model as constants:

```typescript
// src/modules/{module}/lib/{modelName}.ts (at the top)
export const {MODEL_NAME}_EVENTS = {
  CREATED:  '{MODEL_NAME}_CREATED',
  UPDATED:  '{MODEL_NAME}_UPDATED',
  DELETED:  '{MODEL_NAME}_DELETED',
} as const
```

---

## Step 6 — Create the API Route (If Needed)

If the model needs HTTP endpoints, follow `workflows/new-api-route.md` for each endpoint.

At minimum, verify:
- [ ] `app/api/{resource}/route.ts` thin shell created
- [ ] Handler file in `src/modules/{module}/api/`
- [ ] `requireRole` + ownership check on every handler
- [ ] Zod validation on all inputs

---

## Step 7 — Write Tests

Create `src/modules/{module}/lib/{modelName}.test.ts`.

Required tests:
- [ ] Happy path for each exported function
- [ ] `get{ModelName}ById` returns `null` (not an error) when the record does not exist
- [ ] Ownership check — returns `err('FORBIDDEN')` when `requestingUserId` does not own the resource
- [ ] Audit event is written in the same transaction as the mutation
- [ ] List function returns correct pagination metadata
- [ ] Soft delete sets `deletedAt` without removing the row
- [ ] Append-only models have no `update` or `delete` test (no function should exist to test)

---

## Step 8 — Export from Module Index

Add the new model's public types and functions to `src/modules/{module}/index.ts`:

```typescript
// Only export what other modules need — keep internals private
export type { CreateMilestoneInput, MilestoneSummary } from './lib/milestone'
export { getMilestoneById, listMilestones } from './lib/milestone'
```

---

## Step 9 — Final Checklist

- [ ] `schema.prisma` updated with correct types, relations, indexes, and `@@map`
- [ ] Migration file created with a descriptive name and reviewed before applying
- [ ] `prisma generate` run and client is up to date
- [ ] Data-access library created in `src/modules/{module}/lib/`
- [ ] All functions use `Result<T>` — no thrown operational errors
- [ ] Ownership check present in every read/mutate function
- [ ] Audit event written in same `$transaction` as every mutation
- [ ] Append-only constraint respected — no update/delete functions on append-only models
- [ ] Test file created with happy path + ownership failure + pagination
- [ ] New public exports added to `src/modules/{module}/index.ts`
- [ ] If API routes added — `workflows/new-api-route.md` checklist completed
