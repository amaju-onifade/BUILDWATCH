import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { getUploadUrl } from '../lib/storage'
import type { SessionUser } from '@/lib/auth'

/**
 * Handle request for a signed upload URL.
 * Verifies project membership before issuing the URL.
 */
export async function handleGetUploadUrl(
  req: NextRequest,
  session: SessionUser
): Promise<NextResponse> {
  const requestId = nanoid(10)

  try {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')
    const _contentType = searchParams.get('contentType') || 'image/jpeg'

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // Verify membership
    const membership = await prisma.projectMembers.findFirst({
      where: {
        projectId,
        userId: session.userId,
        role: { in: ['proxy', 'contractor'] },
      },
    })

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const submissionId = nanoid(12) // Pre-generate submissionId for the path
    const filename = `${nanoid(8)}.jpg`

    const { url, key } = await getUploadUrl(projectId, submissionId, filename)

    return NextResponse.json({ data: { url, key, submissionId } })

  } catch (err) {
    logger.error('Failed to get upload URL', {
      module: 'submissions',
      requestId,
      error: { message: (err as Error).message },
    })

    return NextResponse.json({ error: 'Internal server error', requestId }, { status: 500 })
  }
}
