# Skill: DB Migration Runner

**Applies to:** Any task that changes the Prisma schema or requires a database migration.  
**Read this entire file before touching `schema.prisma` or running any migration command.**

---

## Core Rules (Never Violate)

1. **Never edit a migration file after it has been applied** — to any environment.
2. **Never delete a migration file** — even from the development history.
3. **The `AuditEvents` table is append-only.** Never add `update` or `delete` capabilities to it.
4. **All schema changes go through `prisma migrate dev`** in development. Never manually alter tables.
5. **Never run `prisma migrate dev` against a production database.** Production migrations run via `prisma migrate deploy` in CI.
6. **Every migration must have a descriptive name** that explains what changes and why.

---

## Step 1 — Plan the Schema Change

Before touching any file, document:

```
Table(s) affected:
Type of change: [ ] Add column  [ ] Remove column  [ ] New table  [ ] Rename  [ ] Index  [ ] Constraint
Is this a breaking change? (existing data affected):
Rollback plan:
```

**Breaking change examples:**
- Removing a column that has data
- Adding a non-nullable column without a default
- Renaming a column (Prisma treats this as drop + add)

For breaking changes, write a data migration plan before proceeding.

---

## Step 2 — Schema Conventions

```prisma
// All models use cuid() as primary key
model Submissions {
  id          String   @id @default(cuid())

  // Foreign keys are named {relation}Id
  projectId   String
  project     Projects @relation(fields: [projectId], references: [id], onDelete: Cascade)

  // Timestamps on every model
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Soft delete pattern
  deletedAt   DateTime?

  @@map("submissions")  // snake_case table names
}
```

Rules:
- All model names: `PascalCase` in Prisma, mapped to `snake_case` tables via `@@map`
- Field names: `camelCase` in Prisma, mapped to `snake_case` columns via `@map` where needed
- All models must have `createdAt` and `updatedAt`
- Foreign key fields must have a corresponding relation field
- `onDelete` behaviour must be explicit — never rely on Prisma's default (Restrict)
- Indexes must be added for every foreign key field and every field used in `WHERE` clauses

---

## Step 3 — Running a Migration (Development)

```bash
# 1. Edit schema.prisma

# 2. Create and apply the migration
npx prisma migrate dev --name descriptive-name-of-change

# 3. Regenerate the Prisma client
npx prisma generate

# 4. Verify the migration file in prisma/migrations/
# Make sure it contains exactly the changes you intended — nothing more

# 5. Run the test suite to confirm nothing broke
npm test
```

**Naming convention for migrations:**

| Change type | Example name |
|-------------|-------------|
| Add table | `add_webhook_events_table` |
| Add column | `add_deleted_at_to_projects` |
| Add index | `add_index_submissions_project_id` |
| Change constraint | `make_phone_nullable_on_users` |
| Data backfill | `backfill_subscription_status_default` |

---

## Step 4 — Running Migrations in Production

Production migrations are **never run manually**. They run automatically in the CI/CD pipeline:

```yaml
# In your Vercel / CI build command:
npx prisma migrate deploy && npm run build
```

`prisma migrate deploy` only applies pending migrations — it never creates new ones or resets data.

---

## Step 5 — Adding a New Table

Template for a new table:

```prisma
model WebhookEvents {
  id                   String    @id @default(cuid())
  flutterwaveEventId   String    @unique
  eventType            String
  status               String    // processing | processed | failed
  rawPayload           String    @db.Text
  errorMessage         String?
  processedAt          DateTime?
  createdAt            DateTime  @default(now())

  @@index([flutterwaveEventId])
  @@index([status])
  @@map("webhook_events")
}
```

Checklist for a new table:
- [ ] `id String @id @default(cuid())`
- [ ] `createdAt DateTime @default(now())`
- [ ] `updatedAt DateTime @updatedAt` (unless append-only)
- [ ] `@@map("snake_case_name")`
- [ ] Indexes on all foreign keys and commonly queried fields
- [ ] `onDelete` behaviour defined on all relations

---

## Step 6 — Adding a Non-Nullable Column to an Existing Table

If you add a non-nullable column to a table that already has rows, you must supply a default or Prisma will refuse to migrate.

**Option A — Column has a sensible default:**
```prisma
status String @default("active")
```

**Option B — Backfill required:**
```prisma
// Step 1: Add as nullable first
status String?
```
```bash
npx prisma migrate dev --name add_status_nullable_to_subscriptions
```
```typescript
// Step 2: Backfill in a seed/script
await prisma.subscriptions.updateMany({
  where: { status: null },
  data: { status: 'active' },
})
```
```prisma
// Step 3: Make non-nullable
status String
```
```bash
npx prisma migrate dev --name make_status_non_nullable_on_subscriptions
```

---

## Step 7 — Renaming a Column

Prisma treats rename as drop + add, which destroys data. Use `@map` instead:

```prisma
// ✅ Safe rename — keeps the old database column name, changes the Prisma field name
subscriptionPlan String @map("plan")  // was: plan String

// ❌ Dangerous — Prisma will drop the old column and create a new one
subscriptionPlan String  // previously was `plan String` — data loss!
```

---

## Step 8 — Rollback Strategy

Prisma does not support automatic migration rollbacks. To roll back:

1. Write a new migration that reverses the change
2. Name it `revert_{original_migration_name}`
3. Apply it through the normal flow

For destructive changes (dropped columns, dropped tables), ensure data has been backed up before the migration runs in production.

---

## Step 9 — Checklist Before Merging a Schema Change

- [ ] Migration name is descriptive and follows naming convention
- [ ] Migration file reviewed manually — contains exactly the intended changes
- [ ] New tables have `id`, `createdAt`, `updatedAt`, `@@map`
- [ ] All relations have explicit `onDelete` behaviour
- [ ] Indexes added for all foreign keys and query-critical fields
- [ ] Non-nullable new columns have a default or a backfill migration
- [ ] No column renamed without using `@map`
- [ ] `prisma generate` has been run and the updated client is committed
- [ ] Test suite passes with the new schema
- [ ] `AuditEvents` table remains append-only (no update/delete added)
