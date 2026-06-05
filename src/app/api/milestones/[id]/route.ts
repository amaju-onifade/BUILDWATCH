import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { handleUpdateMilestoneBudget } from '@/modules/milestones/api/updateBudget'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole(req, ['owner'])
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  return handleUpdateMilestoneBudget(req, session, id)
}
