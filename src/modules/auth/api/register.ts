import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { logger } from '@/lib/logger'
import { RegisterOwnerSchema } from '../types'
import { registerOwner } from '../lib/registerOwner'

export async function handleRegisterOwner(req: NextRequest): Promise<NextResponse> {
  const requestId = nanoid(10)

  try {
    const body = await req.json()
    const parseResult = RegisterOwnerSchema.safeParse(body)
    
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', code: 'VALIDATION_ERROR', issues: parseResult.error.issues },
        { status: 400 }
      )
    }

    const result = await registerOwner(parseResult.data)

    if (!result.ok) {
      return NextResponse.json({ error: result.error, code: result.code }, { status: 400 })
    }

    logger.info('Owner registered successfully', {
      module: 'auth',
      userId: result.data.userId,
      requestId
    })

    const response = NextResponse.json({ data: result.data }, { status: 201 })
    response.cookies.set('bw_session', result.data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })

    return response
  } catch (err) {
    logger.error('Unhandled error in handleRegisterOwner', {
      module: 'auth',
      requestId,
      error: { message: (err as Error).message, stack: (err as Error).stack },
    })

    return NextResponse.json(
      { error: 'Something went wrong', requestId },
      { status: 500 }
    )
  }
}
