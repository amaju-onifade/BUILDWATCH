/**
 * BuildWatch — Flutterwave Webhook Handler
 *
 * File: app/api/payments/webhook/route.ts
 *
 * This is the production-ready webhook handler. Copy this into the route file.
 * Do not modify the signature verification or idempotency logic.
 *
 * Flutterwave docs: https://developer.flutterwave.com/docs/webhooks
 */

import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyFlutterwaveTransaction } from '@/modules/payments/lib/verify'
import { activateSubscription, markSubscriptionFailed } from '@/modules/payments/lib/subscriptions'
import { sendPaymentConfirmationEmail, sendPaymentFailedEmail } from '@/modules/notifications/lib/email'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FlutterwaveWebhookPayload {
  id: string
  type: 'charge.completed' | 'charge.failed' | string
  timestamp: number
  data: {
    id: string
    status: 'succeeded' | 'failed' | 'pending'
    amount: number
    currency: string
    reference: string // your tx_ref
    description: string | null
    customer: {
      id: string
      email: string
      name: string | null
    }
    payment_method: {
      type: string
    }
  }
}

// ─── Signature Verification ───────────────────────────────────────────────────

function verifySignature(rawBody: string, signature: string | null): boolean {
  const secretHash = process.env.FLW_SECRET_HASH
  if (!secretHash) throw new Error('FLW_SECRET_HASH is not set')
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

// ─── Idempotency Check ────────────────────────────────────────────────────────

async function isAlreadyProcessed(flutterwaveEventId: string): Promise<boolean> {
  const existing = await prisma.webhookEvents.findUnique({
    where: { flutterwaveEventId },
    select: { status: true },
  })
  // Re-process if previous attempt failed — allow retry
  return existing?.status === 'processed'
}

// ─── Event Handlers ───────────────────────────────────────────────────────────

async function handleChargeCompleted(payload: FlutterwaveWebhookPayload): Promise<void> {
  const { id: chargeId, reference: txRef, amount, currency } = payload.data

  // Step 1: Look up the pending payment by tx_ref
  const pendingPayment = await prisma.pendingPayments.findUnique({
    where: { txRef },
    include: { owner: true },
  })

  if (!pendingPayment) {
    console.error(`[webhook] No pending payment found for txRef: ${txRef}`)
    return
  }

  // Step 2: Verify with Flutterwave API — NEVER trust webhook payload alone
  const verification = await verifyFlutterwaveTransaction(chargeId)
  const verifiedData = verification.data

  const amountMatches = verifiedData.amount === pendingPayment.amount
  const currencyMatches = verifiedData.currency === pendingPayment.currency
  const statusSucceeded = verifiedData.status === 'succeeded'
  const refMatches = verifiedData.reference === txRef

  if (!amountMatches || !currencyMatches || !statusSucceeded || !refMatches) {
    // Log suspicious event — do not activate subscription
    console.error('[webhook] Verification mismatch', {
      chargeId,
      txRef,
      expected: { amount: pendingPayment.amount, currency: pendingPayment.currency },
      received: { amount: verifiedData.amount, currency: verifiedData.currency, status: verifiedData.status },
    })
    await prisma.pendingPayments.update({
      where: { txRef },
      data: { status: 'suspicious' },
    })
    return
  }

  // Step 3: Activate subscription in database (atomic with audit event)
  await activateSubscription({
    ownerId: pendingPayment.ownerId,
    planId: pendingPayment.planId,
    flutterwaveChargeId: chargeId,
    txRef,
    amount,
    currency,
  })

  // Step 4: Send confirmation email (non-blocking)
  sendPaymentConfirmationEmail({
    email: pendingPayment.owner.email,
    name: pendingPayment.owner.name,
    planId: pendingPayment.planId,
    amount,
    currency,
  }).catch(err => console.error('[webhook] Email send failed:', err))
}

async function handleChargeFailed(payload: FlutterwaveWebhookPayload): Promise<void> {
  const { reference: txRef } = payload.data

  const pendingPayment = await prisma.pendingPayments.findUnique({
    where: { txRef },
    include: { owner: true },
  })

  if (!pendingPayment) return

  await markSubscriptionFailed({
    ownerId: pendingPayment.ownerId,
    txRef,
  })

  sendPaymentFailedEmail({
    email: pendingPayment.owner.email,
    name: pendingPayment.owner.name,
  }).catch(err => console.error('[webhook] Failure email send failed:', err))
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Capture raw body for signature verification — must happen before any parsing
  const rawBody = await req.text()
  const signature = req.headers.get('flutterwave-signature')

  // 1. Verify signature
  const isValid = verifySignature(rawBody, signature)
  if (!isValid) {
    console.warn('[webhook] Invalid signature — request rejected')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // 2. Parse payload
  let payload: FlutterwaveWebhookPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // 3. Idempotency — return 200 immediately if already processed
  const alreadyDone = await isAlreadyProcessed(payload.id)
  if (alreadyDone) {
    return NextResponse.json({ received: true, duplicate: true }, { status: 200 })
  }

  // 4. Record the event as received (before processing, to prevent race conditions)
  await prisma.webhookEvents.upsert({
    where: { flutterwaveEventId: payload.id },
    create: {
      flutterwaveEventId: payload.id,
      eventType: payload.type,
      status: 'processing',
      rawPayload: rawBody,
    },
    update: { status: 'processing' },
  })

  // 5. Respond 200 immediately — Flutterwave has a 60s timeout
  // Heavy processing happens after the response is sent
  const response = NextResponse.json({ received: true }, { status: 200 })

  // 6. Process event asynchronously (does not block the response)
  ;(async () => {
    try {
      switch (payload.type) {
        case 'charge.completed':
          await handleChargeCompleted(payload)
          break
        case 'charge.failed':
          await handleChargeFailed(payload)
          break
        default:
          // Unknown event types are acknowledged but not processed
          console.info(`[webhook] Unhandled event type: ${payload.type}`)
      }

      await prisma.webhookEvents.update({
        where: { flutterwaveEventId: payload.id },
        data: { status: 'processed', processedAt: new Date() },
      })
    } catch (err) {
      console.error('[webhook] Processing error:', err)
      await prisma.webhookEvents.update({
        where: { flutterwaveEventId: payload.id },
        data: { status: 'failed', errorMessage: String(err) },
      })
    }
  })()

  return response
}

// ─── Prisma Schema Reference ──────────────────────────────────────────────────
//
// Add these models to your schema.prisma:
//
// model WebhookEvents {
//   id                   String    @id @default(cuid())
//   flutterwaveEventId   String    @unique
//   eventType            String
//   status               String    // processing | processed | failed
//   rawPayload           String    @db.Text
//   errorMessage         String?
//   processedAt          DateTime?
//   createdAt            DateTime  @default(now())
// }
//
// model PendingPayments {
//   id        String   @id @default(cuid())
//   txRef     String   @unique
//   ownerId   String
//   owner     Users    @relation(fields: [ownerId], references: [id])
//   planId    String
//   amount    Float
//   currency  String
//   status    String   // pending | processed | failed | suspicious
//   createdAt DateTime @default(now())
//   updatedAt DateTime @updatedAt
// }
