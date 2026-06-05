import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { logger } from '@/lib/logger'
import { CreateProjectSchema } from '../types'
import { createProject } from '../lib/createProject'
import type { SessionUser } from '@/lib/auth'

export async function handleCreateProject(req: NextRequest, session: SessionUser): Promise<NextResponse> {
  const requestId = nanoid(10)
  
  try {

    const body = await req.json()
    const parseResult = CreateProjectSchema.safeParse(body)
    
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', code: 'VALIDATION_ERROR', issues: parseResult.error.issues },
        { status: 400 }
      )
    }

    // Verify subscription allows project creation in future steps... (left as domain logic placeholder if needed)

    const result = await createProject(session.userId, parseResult.data)

    if (!result.ok) {
      return NextResponse.json({ error: result.error, code: result.code }, { status: 400 })
    }

    logger.info('Project created successfully', {
      module: 'projects',
      userId: session.userId,
      projectId: result.data.projectId,
      requestId
    })

    return NextResponse.json({ data: result.data }, { status: 201 })
  } catch (err) {
    logger.error('Unhandled error in handleCreateProject', {
      module: 'projects',
      requestId,
      error: { message: (err as Error).message, stack: (err as Error).stack },
    })

    return NextResponse.json(
      { error: 'Something went wrong', requestId },
      { status: 500 }
    )
  }
}
