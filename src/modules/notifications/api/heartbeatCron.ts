import { NextRequest, NextResponse } from 'next/server'
import { config } from '@/lib/config'
import { checkHeartbeatSilence } from '@/modules/notifications/lib/dispatch'
import { logger } from '@/lib/logger'
import { nanoid } from 'nanoid'

/**
 * Handles the cron heartbeat check.
 * Security: validates the Authorization Bearer token against CRON_SECRET.
 */
export async function handleHeartbeatCron(req: NextRequest): Promise<NextResponse> {
  const requestId = nanoid(10)

  // 1. Verify the secret — reject anything that doesn't match
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token || token !== config.cronSecret) {
    logger.warn('Heartbeat cron called with invalid secret', {
      module: 'notifications',
      requestId,
    })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Run the silence check
  try {
    logger.info('Heartbeat cron started', { module: 'notifications', requestId })
    await checkHeartbeatSilence()
    logger.info('Heartbeat cron completed', { module: 'notifications', requestId })
    return NextResponse.json({ ok: true, requestId })
  } catch (err) {
    logger.error('Heartbeat cron failed', {
      module: 'notifications',
      requestId,
      error: { message: (err as Error).message, stack: (err as Error).stack },
    })
    return NextResponse.json({ error: 'Something went wrong', requestId }, { status: 500 })
  }
}
