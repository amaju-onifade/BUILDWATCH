import { NextRequest, NextResponse } from 'next/server'
import { getMilestones } from '@/modules/milestones/lib/getMilestones'
import type { SessionUser } from '@/lib/auth'

/**
 * GET /api/projects/[id]/milestones
 * Returns all milestones for a project in order.
 */
export async function handleListMilestones(
  req: NextRequest,
  session: SessionUser,
  projectId: string
): Promise<NextResponse> {
  const result = await getMilestones(projectId, session.userId)

  if (!result.ok) {
    const status = result.code === 'FORBIDDEN' ? 403 : 500
    return NextResponse.json({ error: result.error, code: result.code }, { status })
  }

  return NextResponse.json({ data: result.data })
}
