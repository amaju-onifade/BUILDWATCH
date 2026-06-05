import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { handleCreateSubmission } from '@/modules/submissions/api/create'

export async function POST(req: NextRequest) {
  const session = await requireRole(req, ['proxy', 'contractor'])
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return handleCreateSubmission(req, session)
}
