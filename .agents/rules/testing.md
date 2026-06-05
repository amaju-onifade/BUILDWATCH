---
trigger: always_on
---

# Testing Rules — BuildWatch

## Philosophy

Tests in BuildWatch serve two purposes: catching regressions in business-critical flows (submission pipeline, payment webhooks, invite redemption, AI report generation), and documenting intended behaviour as executable specifications. Tests are not optional and are not written after the fact.

**The agent must create test files alongside every new module function, API handler, and Server Action.** A pull request that adds code without tests is incomplete.

---

## Test Stack

| Tool | Purpose |
|------|---------|
| **Vitest** | Unit and integration test runner |
| **@testing-library/react** | Component rendering and interaction tests |
| **@testing-library/user-event** | Realistic user interaction simulation |
| **prisma-mock** | In-memory Prisma mock for unit tests |
| **msw** (Mock Service Worker) | HTTP request mocking for API-dependent tests |
| **Supertest** | HTTP-level integration tests for API routes |

**Never use Jest.** BuildWatch uses Vitest exclusively. `describe`, `it`, `expect`, `vi` are the primitives. Do not import from `jest`.

---

## File Locations and Naming

Co-locate test files with the code they test. Never put tests in a separate top-level `__tests__` folder.

```
src/modules/submissions/
  lib/
    createSubmission.ts
    createSubmission.test.ts       ← unit test
  api/
    create.ts
    create.test.ts                 ← integration test (HTTP level)
  components/
    PhotoUploader.tsx
    PhotoUploader.test.tsx         ← component test
```

**Naming convention:**
- Test files: `{filename}.test.ts` or `{filename}.test.tsx`
- Test descriptions use plain English: `it('returns 403 when the proxy is not assigned to the project')`
- No abbreviations in test names — describe the behaviour fully

---

## Test Categories and What Each Covers

### Unit Tests (`lib/` functions)

Unit tests cover pure business logic functions in isolation. Prisma is mocked — no real database calls.

```typescript
// src/modules/submissions/lib/createSubmission.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSubmission } from './createSubmission'
import { prismaMock } from '@/test/prismaMock'

describe('createSubmission', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a submission and audit event in a transaction', async () => {
    prismaMock.$transaction.mockResolvedValueOnce([
      { id: 'sub_001', milestoneId: 'ms_001', proxyId: 'usr_001' },
      { id: 'evt_001' },
    ])

    const result = await createSubmission({
      milestoneId: 'ms_001',
      projectId: 'proj_001',
      proxyId: 'usr_001',
      photos: [{ storageKey: 'projects/proj_001/submissions/sub_001/img.jpg' }],
      caption: 'Foundation work done',
      geoLat: 6.524,
      geoLng: 3.379,
    })

    expect(result.id).toBe('sub_001')
    expect(prismaMock.$transaction).toHaveBeenCalledOnce()
  })

  it('throws if milestone does not belong to the project', async () => {
    prismaMock.milestones.findFirst.mockResolvedValueOnce(null)

    await expect(
      createSubmission({ milestoneId: 'ms_999', projectId: 'proj_001', proxyId: 'usr_001', photos: [] })
    ).rejects.toThrow('FORBIDDEN')
  })
})
```

### Integration Tests (API route handlers)

Integration tests call the handler function directly with a mock `NextRequest`. They use a test database seeded with known data — not Prisma mocks.

```typescript
// src/modules/submissions/api/create.test.ts
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { handleCreateSubmission } from './create'
import { seedTestDb, clearTestDb, closeTestDb } from '@/test/db'

beforeAll(() => seedTestDb())
afterEach(() => clearTestDb())
afterAll(() => closeTestDb())

const mockSession = { userId: 'proxy_001', role: 'proxy' as const }

describe('handleCreateSubmission', () => {
  it('returns 201 and creates submission for a valid proxy request', async () => {
    const req = new NextRequest('http://localhost/api/submissions', {
      method: 'POST',
      body: JSON.stringify({
        milestoneId: 'ms_001',
        photos: ['projects/proj_001/sub_001/img.jpg'],
        caption: 'Columns poured',
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await handleCreateSubmission(req, mockSession)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.id).toBeDefined()
  })

  it('returns 400 when photos array is empty', async () => {
    const req = new NextRequest('http://localhost/api/submissions', {
      method: 'POST',
      body: JSON.stringify({ milestoneId: 'ms_001', photos: [] }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await handleCreateSubmission(req, mockSession)
    expect(res.status).toBe(400)
  })

  it('returns 403 when proxy is not assigned to the milestone project', async () => {
    const req = new NextRequest('http://localhost/api/submissions', {
      method: 'POST',
      body: JSON.stringify({ milestoneId: 'ms_other_project', photos: ['img.jpg'] }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await handleCreateSubmission(req, mockSession)
    expect(res.status).toBe(403)
  })

  it('returns 403 when called with owner session (wrong role)', async () => {
    const ownerSession = { userId: 'owner_001', role: 'owner' as const }
    const req = new NextRequest('http://localhost/api/submissions', {
      method: 'POST',
      body: JSON.stringify({ milestoneId: 'ms_001', photos: ['img.jpg'] }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await handleCreateSubmission(req, ownerSession)
    expect(res.status).toBe(403)
  })
})
```

### Component Tests

Component tests verify rendering, user interactions, and accessible output. They do not test business logic.

```typescript
// src/modules/submissions/components/PhotoUploader.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PhotoUploader } from './PhotoUploader'

describe('PhotoUploader', () => {
  it('renders the upload trigger', () => {
    render(<PhotoUploader milestoneId="ms_001" onUploadComplete={vi.fn()} />)
    expect(screen.getByRole('button', { name: /take photos/i })).toBeInTheDocument()
  })

  it('shows an error when upload fails', async () => {
    const user = userEvent.setup()
    render(<PhotoUploader milestoneId="ms_001" onUploadComplete={vi.fn()} />)
    // trigger error state...
    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })
})
```

---

## Prisma Mock Setup

```typescript
// src/test/prismaMock.ts
import { PrismaClient } from '@prisma/client'
import { mockDeep, mockReset, DeepMockProxy } from 'vitest-mock-extended'
import { vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'

vi.mock('@/lib/db', () => ({
  prisma: mockDeep<PrismaClient>(),
}))

export const prismaMock = prisma as DeepMockProxy<PrismaClient>

beforeEach(() => {
  mockReset(prismaMock)
})
```

---

## Test Database Setup (Integration Tests)

Integration tests run against a dedicated test database defined by `DATABASE_URL_TEST` in `.env.test`. This database is seeded before each test suite and cleared between tests.

```typescript
// src/test/db.ts
import { PrismaClient } from '@prisma/client'

const testPrisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_TEST } },
})

export async function seedTestDb() {
  await testPrisma.users.createMany({
    data: [
      { id: 'owner_001', email: 'owner@test.com', passwordHash: 'x', fullName: 'Test Owner', role: 'owner' },
      { id: 'proxy_001', email: 'proxy@test.com', passwordHash: 'x', fullName: 'Test Proxy', role: 'proxy' },
    ],
  })
  await testPrisma.projects.create({
    data: { id: 'proj_001', name: 'Test Project', ownerId: 'owner_001', location: 'Lagos' },
  })
  await testPrisma.milestones.create({
    data: { id: 'ms_001', projectId: 'proj_001', name: 'Foundation', status: 'in_progress' },
  })
  await testPrisma.projectMembers.create({
    data: { projectId: 'proj_001', userId: 'proxy_001', role: 'proxy' },
  })
}

export async function clearTestDb() {
  // Delete in dependency order
  const tables = ['auditEvents', 'aIReports', 'submissions', 'projectMembers',
                  'milestones', 'inviteTokens', 'subscriptions', 'projects', 'users']
  for (const table of tables) {
    await (testPrisma as any)[table].deleteMany()
  }
}

export async function closeTestDb() {
  await testPrisma.$disconnect()
}
```

---

## Minimum Required Tests Per File Type

| File type | Required test cases |
|-----------|-------------------|
| `lib/` business logic function | Happy path · At least 2 error/edge cases |
| API route handler | 201/200 success · 400 invalid input · 403 wrong role · 403 no ownership |
| Server Action | Happy path · Validation failure · Auth failure |
| React component | Renders without crash · Error state · Loading state (if applicable) |
| Webhook handler | Valid payload + signature · Invalid signature (expects 401) · Duplicate event (expects 200, no re-process) |
| Invite flow | Happy redemption · Expired token · Already-used token · Invalid signature |

---

## Critical Flows — Full Coverage Required

These flows must have end-to-end integration tests. No exceptions.

1. **Photo submission** — capture → validate → compress → enqueue → upload → confirm
2. **Flutterwave webhook** — signature verify → idempotency → transaction verify → subscription activate
3. **Invite redemption** — JWT verify → DB check → user create → role assign → session set
4. **AI report generation** — trigger → prompt build → DeepSeek call → parse → banned-phrase scan → DB write
5. **Owner milestone approval** — ownership check → state transition → audit event → contractor notification

---

## What Not to Mock

| Thing | Mock it? | Why |
|-------|---------|-----|
| Prisma (unit tests) | ✅ Yes | Speed and isolation |
| Prisma (integration tests) | ❌ No | Use test database |
| `fetch` / HTTP calls to external APIs | ✅ Yes (msw) | Prevent real network calls in tests |
| `crypto` | ❌ No | Use real crypto — mocking it defeats security tests |
| `Date.now()` | ✅ Yes, with `vi.setSystemTime()` | For expiry and TTL tests |
| File system | ✅ Yes | No real disk I/O in tests |
| IndexedDB | ✅ Yes (fake-indexeddb) | Browser API not available in Vitest |

---

## Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',          // for component tests
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      thresholds: {
        statements: 70,
        branches: 65,
        functions: 70,
        lines: 70,
      },
      exclude: [
        'src/test/**',
        'src/**/*.test.*',
        'src/app/**',              // thin shells — tested via handler tests
        'prisma/**',
      ],
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
```

---

## Rules Summary

- [ ] Test file created alongside every new `lib/`, `api/`, `actions/`, or `components/` file
- [ ] Unit tests use Prisma mock — never a real database
- [ ] Integration tests use `DATABASE_URL_TEST` — never the development or production database
- [ ] No `console.log` in test files
- [ ] No `.only` or `.skip` committed to the repository
- [ ] `vi.clearAllMocks()` called in `beforeEach` for all unit test suites
- [ ] Webhook tests always include a signature-failure case
- [ ] Invite tests always include expired and already-used token cases
- [ ] Critical flows listed above have integration-level coverage
