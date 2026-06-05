import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { logger } from '@/lib/logger'
import { UpdateMilestoneBudgetSchema } from '@/modules/milestones/types'
import { updateMilestoneBudget } from '@/modules/milestones/lib/updateMilestoneBudget'
import type { SessionUser } from '@/lib/auth'

/**
 * PATCH /api/milestones/[id]
 * Updates the budget allocation for a milestone.
 */
export async function handleUpdateMilestoneBudget(
  req: NextRequest,
  session: SessionUser,
  milestoneId: string
): Promise<NextResponse> {
  const requestId = nanoid(10)

  try {
    const body = await req.json()
    const parsed = UpdateMilestoneBudgetSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', code: 'VALIDATION_ERROR', issues: parsed.error.issues },
        { status: 400 }
      )
    }

    const result = await updateMilestoneBudget(milestoneId, parsed.data, session.userId)

    if (!result.ok) {
      const status = result.code === 'FORBIDDEN' ? 403
        : result.code === 'MILESTONE_LOCKED' ? 409
        : 500
      return NextResponse.json({ error: result.error, code: result.code }, { status })
    }

    return NextResponse.json({ data: result.data })
  } catch (error) {
    logger.error('Unhandled error in handleUpdateMilestoneBudget', {
      module: 'milestones',
      requestId,
      userId: session.userId,
      milestoneId,
      error: { message: (error as Error).message, stack: (error as Error).stack },
    })
    return NextResponse.json({ error: 'Something went wrong', requestId }, { status: 500 })
  }
}
