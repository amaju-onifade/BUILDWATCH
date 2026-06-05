import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { handleCreateProject } from '@/modules/projects/api/create'

export async function POST(req: NextRequest) {
  const session = await requireRole(req, ['owner'])
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return handleCreateProject(req, session)
}
