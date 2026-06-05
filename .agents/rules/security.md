---
trigger: always_on
---

# Security Rules — BuildWatch

## Authentication and Session Management

- All protected routes must call `requireRole()` before any logic executes. There are no exceptions.
- Sessions are JWT-based, signed with `JWT_SECRET`. Tokens expire after 7 days. Never issue non-expiring tokens.
- JWT must be stored in an `httpOnly`, `Secure`, `SameSite=Strict` cookie. Never store JWT in localStorage or sessionStorage.
- Invite links for proxies and contractors use signed, single-use tokens with a 72-hour TTL stored in the database. After first use, the token is marked consumed and rejected on reuse.

```typescript
// ✅ requireRole pattern — use this in every route.ts
export async function requireRole(
  req: NextRequest,
  allowedRoles: UserRole[]
): Promise<SessionUser | null> {
  const token = req.cookies.get('bw_session')?.value
  if (!token) return null
  const user = verifyJWT(token)
  if (!user || !allowedRoles.includes(user.role)) return null
  return user
}
```

---

## Role-Based Access Control (RBAC)

Every resource access must be validated on two axes: **role** and **ownership**.

| Action | Allowed roles | Ownership check required |
|--------|--------------|--------------------------|
| View project | owner, proxy, contractor | Must be a member of the project |
| Create submission | proxy | Must be assigned proxy for the project |
| Approve milestone | owner | Must own the project |
| View AI report | owner | Must own the project |
| View audit trail | owner | Must own the project |
| View payment/billing | owner | Must be the billing owner |
| Receive payment notification | contractor | Must be assigned to the project |

**Rule:** Never trust the `userId` or `projectId` in a request body or URL to establish ownership. Always re-query the database to confirm the relationship.

```typescript
// ✅ Correct — re-query to confirm ownership
const project = await prisma.projects.findFirst({
  where: { id: projectId, ownerId: session.userId }
})
if (!project) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

// ❌ Wrong — trusts client-supplied projectId at face value
if (req.body.ownerId === session.userId) { /* proceed */ }
```

---

## Input Validation

- All API request bodies are validated with Zod before use. No exceptions.
- All URL path parameters and query strings are validated. Never pass a raw route param directly into a database query.
- File uploads (photos) are validated for:
  - MIME type (`image/jpeg`, `image/png`, `image/webp` only)
  - File size (max 10 MB pre-compression; must compress to ≤ 400 KB before storage)
  - No executable content (check magic bytes, not just extension)
- Reject any request with an `Content-Type` that doesn't match the expected type.

---

## Secrets and Credentials

- All secrets live in environment variables. Never hardcode credentials, API keys, or hashes in source code.
- The following variables are server-only and must never appear in `NEXT_PUBLIC_` variables or client bundles:
  - `FLW_CLIENT_ID`, `FLW_CLIENT_SECRET`, `FLW_SECRET_HASH`
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`
  - `DEEPSEEK_API_KEY`
  - `RESEND_API_KEY`
- Run `next build` and inspect the bundle if any secret variable is accidentally referenced client-side — the build will fail with a warning, but verify manually.
- Rotate `JWT_SECRET` and `FLW_SECRET_HASH` if any exposure is suspected. Document the rotation.

---

## Webhook Security (Flutterwave)

Flutterwave webhook payloads must be verified on every request before any processing occurs. The verification uses HMAC-SHA256 with `FLW_SECRET_HASH`.

```typescript
// Mandatory verification — must run BEFORE reading payload
import crypto from 'crypto'

export function verifyFlutterwaveSignature(
  rawBody: string,
  signature: string | null,
  secretHash: string
): boolean {
  if (!signature) return false
  const hash = crypto
    .createHmac('sha256', secretHash)
    .update(rawBody)
    .digest('base64')
  try {
    // timingSafeEqual prevents timing attacks — never use === for this
    return crypto.timingSafeEqual(
      Buffer.from(hash),
      Buffer.from(signature)
    )
  } catch {
    return false
  }
}
```

> **NOTE:** Before shipping, verify the expected digest encoding against the live Flutterwave webhook docs. The example above uses `base64` — some SDK versions and environments send a `hex` digest instead. If verification fails on all valid requests, switch `.digest('base64')` to `.digest('hex')` and re-test against a real Flutterwave sandbox event.

Rules:
- Use `crypto.timingSafeEqual` — never use `===` to compare signatures (timing attack vector).
- Return `401` immediately on signature mismatch. Do not log the raw body on failure.
- Webhook handlers must be idempotent. Record processed webhook IDs in the database and skip duplicates.
- Always verify the transaction via the Flutterwave verification API after receiving a `charge.completed` webhook. Never grant subscription value based on the webhook payload alone.

---

## SQL Injection and Query Safety

- All database access goes through Prisma's query builder. Parameterised queries are enforced automatically.
- `$queryRaw` and `$executeRaw` are banned unless a security comment explains why the query builder cannot be used and confirms the inputs are safe.
- Never interpolate user-supplied strings into query fragments, even with Prisma's tagged template literals, without explicit escaping.

---

## Photo Storage Security

- Photos are stored in Cloudflare R2, never in the application server filesystem.
- Each photo is stored under a path that includes the `projectId` and a UUID — never a user-controlled filename.
- R2 URLs are not public. All photo access is mediated through a signed URL endpoint that verifies the requesting user has membership of the relevant project.
- Signed URLs expire after 1 hour.
- The R2 bucket has no public access policy.

---

## GPS and Location Data

- GPS coordinates captured from proxy submissions are stored encrypted at rest in the database.
- Coordinates are never returned to the proxy in any API response.
- Coordinates are never exposed in client-side state, logs, or error messages.
- The GPS anchor for a project (owner-configured) is stored server-side only and never transmitted to the proxy device.

---

## Rate Limiting

- Apply rate limiting to all unauthenticated routes (login, registration, invite link redemption): 10 requests per minute per IP.
- Apply rate limiting to the photo upload endpoint: 20 uploads per hour per user.
- Apply rate limiting to the Flutterwave webhook endpoint: 200 requests per minute (Flutterwave's IPs only — whitelist in middleware).
- Rate limit responses return `429 Too Many Requests` with a `Retry-After` header.

---

## CSRF Protection

- The Flutterwave webhook endpoint must be exempt from CSRF protection (it is server-to-server).
- All other state-mutating routes (POST, PUT, PATCH, DELETE) called from the browser are protected by the `SameSite=Strict` session cookie — this is the actual CSRF protection mechanism in BuildWatch.

> **NOTE:** Next.js App Router does not ship a CSRF protection utility. The protection here comes entirely from the `SameSite=Strict` attribute on the `bw_session` cookie (configured in `src/lib/auth.ts`). This prevents cross-site requests from including the session cookie. Do not look for or add a separate CSRF token library — it is not needed and would add unnecessary complexity.

---

## Data Privacy and Retention

- Personally identifiable information (PII) stored: email address, full name, phone number (optional), GPS coordinates.
- GPS coordinates are encrypted at rest using AES-256-GCM with a key derived from `JWT_SECRET`. The encryption/decryption helper lives in `src/lib/encryption.ts` and is the only place this operation occurs.
- Deleted projects soft-delete all data. A background job hard-deletes after 90 days.
- Audit trail records are never deleted — they are the legal and accountability record of the project.
- No analytics or tracking SDK that sends PII to a third party may be added without explicit approval.

---

## Dependency Security

- Run `npm audit` before every production deployment. Do not deploy with known high-severity vulnerabilities.
- Pin exact versions for security-sensitive packages (`crypto`, `jsonwebtoken`, `zod`).
- No package that is not actively maintained (last publish > 2 years, no response to CVEs) may be added to direct dependencies.
