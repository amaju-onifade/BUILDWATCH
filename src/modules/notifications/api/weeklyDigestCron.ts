import { NextRequest, NextResponse } from 'next/server'
import { config } from '@/lib/config'
import { compileWeeklyDigest } from '@/modules/notifications/lib/dispatch'
import { logger } from '@/lib/logger'
import { nanoid } from 'nanoid'

/**
 * Handles the weekly digest cron job.
 * Security: validates the Authorization Bearer token against CRON_SECRET.
 */
export async function handleWeeklyDigestCron(req: NextRequest): Promise<NextResponse> {
  const requestId = nanoid(10)

  // 1. Verify the secret
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token || token !== config.cronSecret) {
    logger.warn('Weekly digest cron called with invalid secret', {
      module: 'notifications',
      requestId,
    })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Run the digest compilation
  try {
    logger.info('Weekly digest cron started', { module: 'notifications', requestId })
    await compileWeeklyDigest()
    logger.info('Weekly digest cron completed', { module: 'notifications', requestId })
    return NextResponse.json({ ok: true, requestId })
  } catch (err) {
    logger.error('Weekly digest cron failed', {
      module: 'notifications',
      requestId,
      error: { message: (err as Error).message, stack: (err as Error).stack },
    })
    return NextResponse.json({ error: 'Something went wrong', requestId }, { status: 500 })
  }
}
