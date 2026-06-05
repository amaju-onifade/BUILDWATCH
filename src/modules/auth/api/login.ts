import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { logger } from '@/lib/logger'
import { LoginOwnerSchema } from '../types'
import { loginUser } from '../lib/loginUser'

export async function handleLoginOwner(req: NextRequest): Promise<NextResponse> {
  const requestId = nanoid(10)

  try {
    let email: string, password: string
    const contentType = req.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      const body = await req.json()
      email = body.email
      password = body.password
    } else {
      const formData = await req.formData()
      email = (formData.get('email') as string) || ''
      password = (formData.get('password') as string) || ''
    }

    const parseResult = LoginOwnerSchema.safeParse({ email, password })
    if (!parseResult.success) {
      const wantsJson = contentType.includes('application/json')
      if (wantsJson) {
        return NextResponse.json(
          { error: 'Validation failed', code: 'VALIDATION_ERROR', issues: parseResult.error.issues },
          { status: 400 }
        )
      }
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent('Validation failed')}`, req.url), 303)
    }

    const result = await loginUser(parseResult.data.email, parseResult.data.password)

    if (!result.ok) {
      const wantsJson = contentType.includes('application/json')
      if (wantsJson) {
        return NextResponse.json({ error: result.error, code: result.code }, { status: 401 })
      }
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(result.error)}`, req.url), 303)
    }

    logger.info('User logged in successfully', {
      module: 'auth',
      userId: result.data.userId,
      role: result.data.role,
      requestId
    })

    const targetUrl = result.data.role === 'owner' ? '/dashboard' : '/field'
    const response = NextResponse.redirect(new URL(targetUrl, req.url), 303)
    response.cookies.set('bw_session', result.data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })

    return response
  } catch (err) {
    logger.error('Unhandled error in handleLoginOwner', {
      module: 'auth',
      requestId,
      error: { message: (err as Error).message, stack: (err as Error).stack },
    })

    const contentType = req.headers.get('content-type') || ''
    const wantsJson = contentType.includes('application/json')
    if (wantsJson) {
      return NextResponse.json(
        { error: 'Something went wrong', requestId },
        { status: 500 }
      )
    }
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent('Something went wrong')}`, req.url), 303)
  }
}
