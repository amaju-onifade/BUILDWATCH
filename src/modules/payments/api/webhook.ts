import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { verifyFlutterwaveSignature } from '../lib/signature'
import { handleChargeCompleted } from '../lib/chargeCompleted'

export async function handleFlutterwaveWebhook(req: NextRequest): Promise<NextResponse> {
  try {
    const rawBody = await req.text()
    const signature = req.headers.get('verif-hash') || req.headers.get('flutterwave-webhook-signature')

    // 1. Verify Signature
    if (!verifyFlutterwaveSignature(rawBody, signature)) {
      logger.warn('Webhook signature verification failed', { module: 'payments' })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = JSON.parse(rawBody)

    // 2. Check Idempotency
    const existing = await prisma.webhookEvents.findUnique({
      where: { flutterwaveEventId: payload.id }
    })

    if (existing) {
      return NextResponse.json({ received: true }, { status: 200 })
    }

    // 3. Record Event
    await prisma.webhookEvents.create({
      data: {
        flutterwaveEventId: payload.id,
        eventType: payload.type || payload.event,
        status: 'processing',
        rawPayload: rawBody,
      }
    })

    // 4. Process specific events
    const eventType = payload.type || payload.event
    if (eventType === 'charge.completed') {
      try {
        await handleChargeCompleted(payload)
        
        await prisma.webhookEvents.update({
          where: { flutterwaveEventId: payload.id },
          data: { status: 'processed', processedAt: new Date() }
        })
      } catch (err) {
        logger.error('Failed to process charge.completed event', { 
          module: 'payments', 
          eventId: payload.id,
          error: { message: (err as Error).message }
        })
        
        await prisma.webhookEvents.update({
          where: { flutterwaveEventId: payload.id },
          data: { status: 'failed', errorMessage: (err as Error).message }
        })
      }
    } else {
      // Unhandled events are just acknowledged
      await prisma.webhookEvents.update({
        where: { flutterwaveEventId: payload.id },
        data: { status: 'processed', processedAt: new Date(), errorMessage: 'Ignored: Unhandled event type' }
      })
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    logger.error('Failed to handle webhook request', { module: 'payments', error: { message: (error as Error).message } })
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
