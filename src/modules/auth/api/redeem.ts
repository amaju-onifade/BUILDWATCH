import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { logger } from '@/lib/logger'
import { RedeemInviteSchema } from '../types'
import { redeemInvite } from '../lib/redeemInvite'

export async function handleRedeemInvite(req: NextRequest): Promise<NextResponse> {
  const requestId = nanoid(10)

  try {
    const body = await req.json()
    const parseResult = RedeemInviteSchema.safeParse(body)
    
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', code: 'VALIDATION_ERROR', issues: parseResult.error.issues },
        { status: 400 }
      )
    }

    const result = await redeemInvite(parseResult.data)

    if (!result.ok) {
      logger.warn('Invite redeem failed', {
        module: 'auth',
        requestId,
        code: result.code,
        error: result.error,
      })
      const status = result.code === 'INVITE_NOT_FOUND' || result.code === 'INVITE_INVALID' ? 404 : 400
      return NextResponse.json({ error: result.error, code: result.code }, { status: status })
    }

    logger.info('Invite redeemed successfully', {
      module: 'auth',
      requestId
    })

    const response = NextResponse.json({ data: { success: true } }, { status: 200 })
    response.cookies.set('bw_session', result.data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })

    return response
  } catch (err) {
    logger.error('Unhandled error in handleRedeemInvite', {
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
