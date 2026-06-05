import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { verifyFlutterwaveTransaction } from './transaction'

export async function handleChargeCompleted(payload: any) {
  const txRef = payload.data?.reference
  const chargeId = payload.data?.id
  const _amount = payload.data?.amount
  
  if (!txRef || !chargeId) {
    throw new Error('Missing reference or chargeId in payload')
  }

  // Verify the transaction explicitly (do not trust webhook payload)
  const verification = await verifyFlutterwaveTransaction(chargeId)
  const verifiedData = verification.data

  if (verifiedData.status !== 'succeeded') {
    throw new Error('Transaction was not successful in verification check')
  }

  const pendingTx = await prisma.pendingPayments.findUnique({
    where: { txRef }
  })

  if (!pendingTx) {
    throw new Error(`Transaction reference ${txRef} not found in pending records`)
  }

  if (verifiedData.amount !== pendingTx.amount) {
    await prisma.pendingPayments.update({
      where: { txRef },
      data: { status: 'suspicious' }
    })
    throw new Error(`Amount mismatch: expected ${pendingTx.amount}, got ${verifiedData.amount}`)
  }

  // Atomically fulfill the payment and update the subscription
  await prisma.$transaction(async (tx) => {
    // 1. Mark payment processed
    await tx.pendingPayments.update({
      where: { txRef },
      data: { status: 'processed' }
    })

    // 2. Compute new subscription dates
    const _subs = await tx.subscriptions.findUnique({
      where: { userId: pendingTx.ownerId }
    })
    
    // Defaulting to monthly if plan is standard, logic could be more complex depending on `planId`
    const now = new Date()
    const nextMonth = new Date(now.setMonth(now.getMonth() + 1))

    // 3. Update subscription
    await tx.subscriptions.update({
      where: { userId: pendingTx.ownerId },
      data: {
        status: 'active',
        planId: pendingTx.planId,
        currentPeriodEnd: nextMonth,
      }
    })
    
    // 4. Audit Trail
    await tx.auditEvents.create({
      data: {
        eventType: 'SUBSCRIPTION_ACTIVATED',
        actorId: pendingTx.ownerId,
        resourceId: pendingTx.planId,
        resourceType: 'plan',
      }
    })
  })

  logger.info('Subscription active and payment recorded', {
    module: 'payments',
    txRef,
    ownerId: pendingTx.ownerId
  })
}
