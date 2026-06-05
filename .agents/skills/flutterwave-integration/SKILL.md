# Skill: Flutterwave Integration

**Applies to:** Any task involving payments, subscriptions, billing, trials, or webhook handling in BuildWatch.  
**Read this entire file before writing a single line of payment-related code.**

---

## Overview

BuildWatch uses Flutterwave v4 exclusively for **subscription billing** — charging owners their monthly/annual plan fee. Flutterwave is NOT used to move construction funds between owner and contractor. That is out of scope.

Payment flows in scope:
1. Owner starts a 21-day free trial (no card required at sign-up)
2. Owner subscribes to a paid plan (Starter $15/mo, Builder $28/mo, Pro $45/mo)
3. Recurring monthly/annual charge via Flutterwave subscription
4. Subscription cancellation / downgrade
5. Webhook handler updating the owner's subscription state in the database

---

## Environment Setup

### API Endpoints

| Environment | Base URL |
|-------------|---------|
| Sandbox | `https://developersandbox-api.flutterwave.com` |
| Production | `https://f4bexperience.flutterwave.com` |

OAuth token endpoint (both environments):
```
https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token
```

### Required Environment Variables

```env
# Flutterwave OAuth credentials (get from Flutterwave dashboard → Settings → API Keys)
FLW_CLIENT_ID=your_client_id
FLW_CLIENT_SECRET=your_client_secret

# Webhook signature verification (set in Flutterwave dashboard → Settings → Webhooks)
FLW_SECRET_HASH=your_secret_hash

# Set automatically by Next.js config
NODE_ENV=development|production
```

### Environment Config (`src/lib/flutterwave.ts`)

```typescript
const isProd = process.env.NODE_ENV === 'production'

export const FLW_CONFIG = {
  baseUrl: isProd
    ? 'https://f4bexperience.flutterwave.com'
    : 'https://developersandbox-api.flutterwave.com',
  tokenUrl: 'https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token',
  clientId: process.env.FLW_CLIENT_ID!,
  clientSecret: process.env.FLW_CLIENT_SECRET!,
  secretHash: process.env.FLW_SECRET_HASH!,
}
```

---

## Authentication — OAuth 2.0 Token Manager

Flutterwave v4 uses OAuth 2.0 client credentials. Access tokens expire after **10 minutes**. The token manager must refresh proactively (at least 60 seconds before expiry).

**File:** `src/lib/flutterwave-token-manager.ts`

```typescript
import { FLW_CONFIG } from './flutterwave'

interface TokenCache {
  accessToken: string
  expiresAt: number // epoch ms
}

let cache: TokenCache | null = null

async function fetchNewToken(): Promise<TokenCache> {
  const res = await fetch(FLW_CONFIG.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: FLW_CONFIG.clientId,
      client_secret: FLW_CONFIG.clientSecret,
      grant_type: 'client_credentials',
    }),
  })

  if (!res.ok) {
    throw new Error(`Flutterwave token fetch failed: ${res.status}`)
  }

  const data = await res.json()
  return {
    accessToken: data.access_token,
    // Subtract 60s buffer to refresh before actual expiry
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  }
}

export async function getFlutterwaveToken(): Promise<string> {
  if (!cache || Date.now() >= cache.expiresAt) {
    cache = await fetchNewToken()
  }
  return cache.accessToken
}
```

**Rule:** All Flutterwave API calls must use `getFlutterwaveToken()`. Never hardcode tokens.

---

## Webhook Handler

Webhooks are the primary integration point. Flutterwave POSTs to your webhook URL when a subscription charge succeeds or fails.

### Setup Checklist

1. Deploy the webhook endpoint at `/api/payments/webhook`
2. Log in to Flutterwave dashboard → Settings → Webhooks
3. Set webhook URL to `https://your-domain.com/api/payments/webhook`
4. Set the Secret Hash — store this value as `FLW_SECRET_HASH` in your env
5. Enable all webhook event types

### Signature Verification

Every webhook request MUST be verified before processing. Use HMAC-SHA256.

```typescript
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
  // Use timingSafeEqual to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(hash),
      Buffer.from(signature)
    )
  } catch {
    return false
  }
}
```

See full reference implementation: `skills/flutterwave-integration/resources/webhook-handler.ts`

### Webhook Payload Structure

```typescript
interface FlutterwaveWebhookPayload {
  id: string           // Webhook event ID e.g. "wbk_W5p6ktwU0jQ8RO4By860"
  type: string         // Event type e.g. "charge.completed"
  timestamp: number    // Unix timestamp ms
  data: {
    id: string         // Transaction/charge ID e.g. "chg_Hq4oBRTJ4r"
    status: string     // "succeeded" | "failed" | "pending"
    amount: number
    currency: string
    reference: string  // Your tx_ref — use this to look up the subscription
    customer: {
      id: string
      email: string
      name: string | null
    }
    payment_method: {
      type: string     // "card" | "mobile_money" | "bank_transfer"
    }
  }
}
```

### Idempotency — Mandatory

Flutterwave may send the same webhook more than once. Your handler must be idempotent:

```typescript
// Check if already processed
const existing = await prisma.webhookEvents.findUnique({
  where: { flutterwaveEventId: payload.id }
})
if (existing) {
  // Already processed — return 200 without re-processing
  return NextResponse.json({ received: true }, { status: 200 })
}

// Record it first, then process
await prisma.webhookEvents.create({
  data: {
    flutterwaveEventId: payload.id,
    eventType: payload.type,
    status: 'processing',
    rawPayload: JSON.stringify(payload),
  }
})
```

### Always Verify the Transaction

After receiving a `charge.completed` webhook, call the Flutterwave transaction verification endpoint before granting subscription access. Never trust the webhook payload alone.

```typescript
export async function verifyFlutterwaveTransaction(chargeId: string) {
  const token = await getFlutterwaveToken()
  const res = await fetch(`${FLW_CONFIG.baseUrl}/charges/${chargeId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Transaction verification failed: ${res.status}`)
  return res.json()
}
```

After verification, confirm:
- `data.status === 'succeeded'`
- `data.amount` matches the expected plan price
- `data.currency` matches the expected currency
- `data.reference` matches the `tx_ref` you stored when initiating the charge

---

## Subscription Flow

### Plans (from PRD)

| Plan | Monthly (USD) | Annual (USD) | Projects |
|------|--------------|-------------|---------|
| Starter | $15 | — | 1 |
| Builder | $28 | — | 3 |
| Pro | $45 | — | Unlimited |

### Trial Logic

- On user registration, set `trialEndsAt = now + 21 days`, `subscriptionStatus = 'trialing'`
- Trial requires no card
- On trial expiry, status transitions to `'expired'` — owner is locked out of new project creation and AI reports
- Owner may subscribe at any time during or after trial

### Initiating a Subscription Charge

Use Flutterwave's Standard (redirect) checkout to collect payment. This sends the owner to Flutterwave's hosted page and redirects back on completion.

```typescript
export async function initiateSubscriptionCheckout(params: {
  ownerId: string
  ownerEmail: string
  planId: string
  amount: number
  currency: string
  redirectUrl: string
}) {
  const token = await getFlutterwaveToken()
  const txRef = `bw-${params.ownerId}-${Date.now()}`

  // Store pending transaction reference before redirecting
  await prisma.pendingPayments.create({
    data: {
      txRef,
      ownerId: params.ownerId,
      planId: params.planId,
      amount: params.amount,
      currency: params.currency,
      status: 'pending',
    }
  })

  const res = await fetch(`${FLW_CONFIG.baseUrl}/payments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tx_ref: txRef,
      amount: params.amount,
      currency: params.currency,
      redirect_url: params.redirectUrl,
      customer: { email: params.ownerEmail },
      customizations: {
        title: 'BuildWatch Subscription',
        description: `BuildWatch ${params.planId} plan`,
        logo: `${process.env.NEXT_PUBLIC_APP_URL}/logo.png`,
      },
    }),
  })

  if (!res.ok) throw new Error(`Checkout initiation failed: ${res.status}`)
  const data = await res.json()
  return data.data.link // Redirect the owner to this URL
}
```

### Subscription State Machine

```
trialing → active       (via charge.completed webhook + verification)
trialing → expired      (via cron job at trial end date)
active   → past_due     (via charge.failed webhook)
active   → cancelled    (via owner request)
past_due → active       (via successful retry charge)
past_due → cancelled    (via 3 failed retries)
cancelled → active      (via new subscription checkout)
expired   → active      (via new subscription checkout)
```

Store subscription state in a `subscriptions` table, not directly on the `users` table.

---

## API Route Locations

| Route | Purpose |
|-------|---------|
| `POST /api/payments/checkout` | Initiate checkout, return redirect URL |
| `POST /api/payments/webhook` | Receive Flutterwave webhook events |
| `GET /api/payments/subscription` | Get current owner subscription state |
| `POST /api/payments/cancel` | Owner cancels subscription |

---

## Error Handling

| Scenario | Response |
|----------|---------|
| Signature verification fails | `401` — log the failure, do not process |
| Transaction verification fails | `500` — mark webhook as `failed`, retry later |
| Unknown event type | `200` — acknowledge receipt, do nothing |
| Amount mismatch | `200` — mark as `suspicious`, alert via email, do not activate |
| Duplicate webhook | `200` — skip silently |

---

## Testing

Use Flutterwave's sandbox environment for all development and staging testing.

- Sandbox base URL: `https://developersandbox-api.flutterwave.com`
- Test card numbers are available in the Flutterwave dashboard test mode
- Webhook testing: use [webhook.site](https://webhook.site) to inspect payloads during development
- Use `ngrok` or Vercel preview URLs to receive webhooks on localhost

**Test reference prefix:** Use `bw-test-` prefix for all sandbox `tx_ref` values so they are easily identified.

---

## Security Checklist

Before marking any payment task complete, confirm:

- [ ] `FLW_CLIENT_SECRET` and `FLW_SECRET_HASH` are in env vars, not code
- [ ] Webhook signature verified with `timingSafeEqual` before any processing
- [ ] Transaction verified via API after `charge.completed` event
- [ ] Webhook handler is idempotent (duplicate event check in place)
- [ ] Amount, currency, and `tx_ref` are all validated post-verification
- [ ] No Flutterwave credential is referenced in any `NEXT_PUBLIC_` variable
- [ ] All Flutterwave API calls go through the server — never the browser

---

## Database Schema Reference

Add these models to `schema.prisma` before implementing any payment flow. Both tables are referenced by the checkout and webhook handler code above.

```prisma
model PendingPayments {
  id        String   @id @default(cuid())
  txRef     String   @unique           // your internal tx_ref sent to Flutterwave
  ownerId   String
  owner     Users    @relation(fields: [ownerId], references: [id])
  planId    String                     // starter | builder | pro
  amount    Float
  currency  String                     // USD | NGN etc.
  status    String   @default("pending") // pending | processed | failed | suspicious
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([txRef])
  @@index([ownerId])
  @@map("pending_payments")
}

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

**Rule:** Run `npx prisma migrate dev --name add_payments_tables` after adding these models. See `skills/db-migration-runner/SKILL.md` for the full migration workflow.

---

## Reference

- Full API docs: https://developer.flutterwave.com/docs
- Webhook reference: https://developer.flutterwave.com/docs/webhooks
- Authentication reference: https://developer.flutterwave.com/docs/authentication
- Environments: https://developer.flutterwave.com/docs/environments
- Webhook handler resource: `skills/flutterwave-integration/resources/webhook-handler.ts`
