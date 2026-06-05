# Skill: Auth and Invites

**Applies to:** Any task involving authentication, session management, invite link generation, invite redemption, role assignment, or user onboarding.  
**Read this entire file before writing any auth-related code.**

---

## Overview

BuildWatch has two distinct auth flows:

1. **Owner registration and login** — standard email/password, with a 21-day free trial started automatically on first registration.
2. **Proxy and contractor invite** — owners invite these roles via a signed, single-use link. Invitees do not self-register. They arrive via the link, set a password, and are immediately assigned to the project.

**Roles are immutable after assignment.** An owner cannot become a proxy. A proxy cannot be promoted to owner. Role assignment happens once — at account creation — and is locked.

---

## Session Architecture

- Sessions use **JWT stored in a `httpOnly`, `Secure`, `SameSite=Strict` cookie** named `bw_session`.
- JWT payload:

```typescript
interface JWTPayload {
  sub: string        // userId
  role: UserRole     // 'owner' | 'proxy' | 'contractor'
  iat: number        // issued at
  exp: number        // expires at (7 days from issue)
}
```

- Tokens expire after **7 days**. No refresh tokens in MVP — users re-authenticate after expiry.
- JWT is signed with `JWT_SECRET` using HS256.

### Session Helpers (`src/lib/auth.ts`)

```typescript
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'

const COOKIE_NAME = 'bw_session'
const JWT_ALG = 'HS256'
const SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60  // 7 days

export type UserRole = 'owner' | 'proxy' | 'contractor'

export interface SessionUser {
  userId: string
  role: UserRole
}

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET is not set')
  return new TextEncoder().encode(secret)
}

export async function createSession(user: SessionUser): Promise<string> {
  const token = await new SignJWT({ sub: user.userId, role: user.role })
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecret())
  return token
}

export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: [JWT_ALG] })
    if (!payload.sub || !payload.role) return null
    return { userId: payload.sub, role: payload.role as UserRole }
  } catch {
    return null
  }
}

// For use in Server Components and Server Actions
export async function getSession(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE_NAME)?.value
  if (!token) return null
  return verifySession(token)
}

// For use in API route handlers (NextRequest available)
export async function requireRole(
  req: NextRequest,
  allowedRoles: UserRole[]
): Promise<SessionUser | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token) return null
  const session = await verifySession(token)
  if (!session || !allowedRoles.includes(session.role)) return null
  return session
}

export function setSessionCookie(token: string): void {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: SESSION_DURATION_SECONDS,
    path: '/',
  })
}

export function clearSessionCookie(): void {
  cookies().set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  })
}
```

---

## Owner Registration

Registration creates the user, starts the free trial, and sets the session cookie in one atomic operation.

```typescript
// src/modules/auth/lib/registerOwner.ts
import { hash } from 'bcryptjs'
import { prisma } from '@/lib/db'
import { createSession, setSessionCookie } from '@/lib/auth'

const TRIAL_DURATION_DAYS = 21
const BCRYPT_ROUNDS = 12

interface RegisterOwnerInput {
  email: string
  password: string
  fullName: string
}

export async function registerOwner(input: RegisterOwnerInput): Promise<{ userId: string }> {
  const existing = await prisma.users.findUnique({ where: { email: input.email } })
  if (existing) throw new Error('EMAIL_TAKEN')

  const passwordHash = await hash(input.password, BCRYPT_ROUNDS)

  const trialEndsAt = new Date()
  trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DURATION_DAYS)

  const { user } = await prisma.$transaction(async tx => {
    const user = await tx.users.create({
      data: {
        email: input.email.toLowerCase().trim(),
        passwordHash,
        fullName: input.fullName.trim(),
        role: 'owner',
      },
    })

    await tx.subscriptions.create({
      data: {
        userId: user.id,
        status: 'trialing',
        planId: null,
        trialEndsAt,
      },
    })

    await tx.auditEvents.create({
      data: {
        eventType: 'USER_REGISTERED',
        actorId: user.id,
        resourceId: user.id,
        resourceType: 'user',
        projectId: null,
      },
    })

    return { user }
  })

  const token = await createSession({ userId: user.id, role: 'owner' })
  setSessionCookie(token)

  return { userId: user.id }
}
```

---

## Owner Login

```typescript
// src/modules/auth/lib/loginOwner.ts
import { compare } from 'bcryptjs'
import { prisma } from '@/lib/db'
import { createSession, setSessionCookie } from '@/lib/auth'

export async function loginOwner(email: string, password: string): Promise<void> {
  const user = await prisma.users.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: { id: true, passwordHash: true, role: true, deletedAt: true },
  })

  // Constant-time comparison path — always compare even if user not found
  // to prevent user enumeration via timing
  const dummyHash = '$2a$12$dummy.hash.to.prevent.timing.attacks.xxxxxxxxxx'
  const passwordMatch = await compare(password, user?.passwordHash ?? dummyHash)

  if (!user || !passwordMatch || user.deletedAt) {
    throw new Error('INVALID_CREDENTIALS')
  }

  if (user.role !== 'owner') {
    // Proxies and contractors use the invite flow, not the main login
    throw new Error('INVALID_CREDENTIALS')
  }

  const token = await createSession({ userId: user.id, role: 'owner' })
  setSessionCookie(token)
}
```

---

## Invite Link System

Proxies and contractors are never self-registered. An owner generates an invite link that contains a signed, single-use token. The invitee clicks the link, sets a password, and is assigned to the project.

### Invite Token Structure

```typescript
interface InviteTokenPayload {
  inviteId: string    // references InviteTokens table
  projectId: string
  role: 'proxy' | 'contractor'
  email: string
  expiresAt: number   // epoch ms — 72 hours from creation
}
```

Invite tokens are **signed JWTs** stored in the database. On redemption, both the JWT signature and the database record are checked. The database record is the source of truth — the token is marked `consumed` on first use.

### Generating an Invite

```typescript
// src/modules/auth/lib/generateInvite.ts
import { SignJWT } from 'jose'
import { prisma } from '@/lib/db'
import { createId } from '@paralleldrive/cuid2'

const INVITE_TTL_HOURS = 72

export async function generateInviteLink(params: {
  projectId: string
  ownerUserId: string
  inviteeEmail: string
  role: 'proxy' | 'contractor'
}): Promise<string> {
  // Confirm the owner actually owns this project
  const project = await prisma.projects.findFirst({
    where: { id: params.projectId, ownerId: params.ownerUserId },
    select: { id: true, name: true },
  })
  if (!project) throw new Error('FORBIDDEN')

  // Invalidate any existing pending invite for this email + project + role
  await prisma.inviteTokens.updateMany({
    where: {
      projectId: params.projectId,
      inviteeEmail: params.inviteeEmail.toLowerCase(),
      role: params.role,
      status: 'pending',
    },
    data: { status: 'invalidated' },
  })

  const inviteId = createId()
  const expiresAt = new Date(Date.now() + INVITE_TTL_HOURS * 60 * 60 * 1000)

  await prisma.inviteTokens.create({
    data: {
      id: inviteId,
      projectId: params.projectId,
      invitedByUserId: params.ownerUserId,
      inviteeEmail: params.inviteeEmail.toLowerCase().trim(),
      role: params.role,
      status: 'pending',
      expiresAt,
    },
  })

  const secret = new TextEncoder().encode(process.env.JWT_SECRET)
  const token = await new SignJWT({
    inviteId,
    projectId: params.projectId,
    role: params.role,
    email: params.inviteeEmail.toLowerCase(),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(expiresAt.toISOString())
    .sign(secret)

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${encodeURIComponent(token)}`
  return inviteUrl
}
```

### Delivering the Invite

Invites can be sent via email (Resend) or WhatsApp link. Both delivery methods are available. The invite URL is the same regardless of delivery channel.

```typescript
// src/modules/auth/lib/deliverInvite.ts

export async function deliverInviteByEmail(params: {
  inviteUrl: string
  inviteeEmail: string
  projectName: string
  role: 'proxy' | 'contractor'
  ownerName: string
}): Promise<void> {
  // Use Resend — see notifications module for sendEmail helper
  await sendEmail({
    to: params.inviteeEmail,
    subject: `${params.ownerName} has invited you to BuildWatch`,
    templateId: 'invite',
    data: {
      projectName: params.projectName,
      role: params.role,
      inviteUrl: params.inviteUrl,
      expiryHours: 72,
    },
  })
}

export function buildWhatsAppShareUrl(inviteUrl: string, projectName: string): string {
  const message = encodeURIComponent(
    `You've been invited to track the ${projectName} project on BuildWatch. Tap the link to get started: ${inviteUrl}`
  )
  return `https://wa.me/?text=${message}`
}
```

### Redeeming an Invite

```typescript
// src/modules/auth/lib/redeemInvite.ts
import { jwtVerify } from 'jose'
import { hash } from 'bcryptjs'
import { prisma } from '@/lib/db'
import { createSession, setSessionCookie } from '@/lib/auth'

const BCRYPT_ROUNDS = 12

export async function redeemInvite(params: {
  token: string
  fullName: string
  password: string
}): Promise<void> {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET)

  // 1. Verify JWT signature and expiry
  let payload: { inviteId: string; projectId: string; role: string; email: string }
  try {
    const { payload: p } = await jwtVerify(params.token, secret, { algorithms: ['HS256'] })
    payload = p as typeof payload
  } catch {
    throw new Error('INVITE_INVALID')
  }

  // 2. Check database record — source of truth
  const invite = await prisma.inviteTokens.findUnique({
    where: { id: payload.inviteId },
  })

  if (!invite) throw new Error('INVITE_NOT_FOUND')
  if (invite.status !== 'pending') throw new Error('INVITE_ALREADY_USED')
  if (invite.expiresAt < new Date()) throw new Error('INVITE_EXPIRED')
  if (invite.role !== 'proxy' && invite.role !== 'contractor') throw new Error('INVITE_INVALID')

  // 3. Create user and assign to project atomically
  const passwordHash = await hash(params.password, BCRYPT_ROUNDS)

  const { user } = await prisma.$transaction(async tx => {
    // Check if user already exists (re-invite scenario)
    let user = await tx.users.findUnique({
      where: { email: invite.inviteeEmail },
    })

    if (user && user.role !== invite.role) throw new Error('ROLE_CONFLICT')

    if (!user) {
      user = await tx.users.create({
        data: {
          email: invite.inviteeEmail,
          passwordHash,
          fullName: params.fullName.trim(),
          role: invite.role as 'proxy' | 'contractor',
        },
      })
    }

    // Assign to project
    await tx.projectMembers.upsert({
      where: {
        projectId_userId: {
          projectId: invite.projectId,
          userId: user.id,
        },
      },
      create: {
        projectId: invite.projectId,
        userId: user.id,
        role: invite.role,
      },
      update: {},  // already a member — no-op
    })

    // Consume the invite — mark as used, not deleted
    await tx.inviteTokens.update({
      where: { id: invite.id },
      data: { status: 'consumed', consumedAt: new Date(), consumedByUserId: user.id },
    })

    await tx.auditEvents.create({
      data: {
        eventType: 'INVITE_REDEEMED',
        actorId: user.id,
        resourceId: invite.id,
        resourceType: 'invite',
        projectId: invite.projectId,
      },
    })

    return { user }
  })

  const token = await createSession({
    userId: user.id,
    role: user.role as 'proxy' | 'contractor',
  })
  setSessionCookie(token)
}
```

---

## Invite Error Handling

| Error code | Meaning | UI message |
|-----------|---------|-----------|
| `INVITE_INVALID` | JWT signature failed | "This invite link is not valid." |
| `INVITE_NOT_FOUND` | No DB record | "This invite link could not be found." |
| `INVITE_ALREADY_USED` | Status is `consumed` or `invalidated` | "This invite link has already been used. Ask the owner for a new one." |
| `INVITE_EXPIRED` | Past 72hr TTL | "This invite link has expired. Ask the owner to send a new one." |
| `ROLE_CONFLICT` | Email exists with different role | Contact support — do not expose details to user |
| `EMAIL_TAKEN` | Owner registration: email in use | "An account with this email already exists." |
| `INVALID_CREDENTIALS` | Login failure | "Email or password is incorrect." (never specify which) |

---

## Route Protection Middleware

```typescript
// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'

const OWNER_ROUTES = ['/dashboard', '/projects', '/reports', '/billing']
const PROXY_ROUTES = ['/submit', '/proxy']
const CONTRACTOR_ROUTES = ['/site', '/contractor']
const PUBLIC_ROUTES = ['/login', '/register', '/invite', '/']

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname

  const isPublic = PUBLIC_ROUTES.some(r => pathname.startsWith(r))
  if (isPublic) return NextResponse.next()

  const token = req.cookies.get('bw_session')?.value
  const session = token ? await verifySession(token) : null

  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Role-based route enforcement
  if (OWNER_ROUTES.some(r => pathname.startsWith(r)) && session.role !== 'owner') {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  if (PROXY_ROUTES.some(r => pathname.startsWith(r)) && session.role !== 'proxy') {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  if (CONTRACTOR_ROUTES.some(r => pathname.startsWith(r)) && session.role !== 'contractor') {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/payments/webhook).*)'],
}
```

**Note:** The Flutterwave webhook route (`/api/payments/webhook`) is excluded from middleware — it uses its own signature verification.

---

## Database Schema Reference

```prisma
model Users {
  id           String    @id @default(cuid())
  email        String    @unique
  passwordHash String
  fullName     String
  role         String    // owner | proxy | contractor — immutable after creation
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  deletedAt    DateTime? // soft delete

  projectMembers  ProjectMembers[]
  invitesSent     InviteTokens[]   @relation("InvitedBy")
  auditEvents     AuditEvents[]

  @@index([email])
  @@map("users")
}

model InviteTokens {
  id                String    @id @default(cuid())
  projectId         String
  invitedByUserId   String
  inviteeEmail      String
  role              String    // proxy | contractor
  status            String    // pending | consumed | invalidated | expired
  expiresAt         DateTime
  consumedAt        DateTime?
  consumedByUserId  String?
  createdAt         DateTime  @default(now())

  project     Projects @relation(fields: [projectId], references: [id])
  invitedBy   Users    @relation("InvitedBy", fields: [invitedByUserId], references: [id])

  @@index([projectId])
  @@index([inviteeEmail])
  @@index([status])
  @@map("invite_tokens")
}

model ProjectMembers {
  projectId String
  userId    String
  role      String   // proxy | contractor (owner is stored on Project directly)
  createdAt DateTime @default(now())

  project Projects @relation(fields: [projectId], references: [id])
  user    Users    @relation(fields: [userId], references: [id])

  @@id([projectId, userId])
  @@map("project_members")
}
```

---

## Security Checklist

Before marking any auth or invite task complete:

- [ ] Session cookie is `httpOnly`, `Secure`, `SameSite=Strict`
- [ ] JWT payload contains only `sub`, `role`, `iat`, `exp` — no sensitive data
- [ ] Password hashing uses bcrypt with ≥ 12 rounds
- [ ] Login uses a constant-time dummy hash to prevent user enumeration
- [ ] Login error message never specifies whether email or password was wrong
- [ ] Invite token is validated against both JWT signature AND database record
- [ ] Invite database record is marked `consumed` — never deleted — on redemption
- [ ] Previous pending invites for the same email+project+role are invalidated before generating a new one
- [ ] Middleware excludes only the Flutterwave webhook from session checks
- [ ] Role is immutable — no update path changes a user's role after creation
- [ ] `requireRole` is called in every API route before any logic
