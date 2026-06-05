import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { handleGetUploadUrl } from '@/modules/submissions/api/getUploadUrl'

export async function GET(req: NextRequest) {
  const session = await requireRole(req, ['proxy', 'contractor'])
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return handleGetUploadUrl(req, session)
}
