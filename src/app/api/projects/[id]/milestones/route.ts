import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { handleListMilestones } from '@/modules/milestones/api/list'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole(req, ['owner'])
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  return handleListMilestones(req, session, id)
}
