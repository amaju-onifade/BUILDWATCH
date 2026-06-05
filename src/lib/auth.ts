import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'
import { config as appConfig } from './config'

const COOKIE_NAME = 'bw_session'
const JWT_ALG = 'HS256'
const SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60  // 7 days

export type UserRole = 'owner' | 'proxy' | 'contractor'

export interface SessionUser {
  userId: string
  role: UserRole
}

function getSecret(): Uint8Array {
  const secret = appConfig.jwtSecret
  if (!secret) throw new Error('JWT_SECRET is not set')
  return new TextEncoder().encode(secret)
}

export async function createSession(user: SessionUser): Promise<string> {
  const token = await new SignJWT({ sub: user.userId, role: user.role })
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecret())
  return token
}

export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: [JWT_ALG] })
    if (!payload.sub || !payload.role) return null
    return { userId: payload.sub as string, role: payload.role as UserRole }
  } catch {
    return null
  }
}

// For use in Server Components and Server Actions
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifySession(token)
}

// For use in API route handlers (NextRequest available)
export async function requireRole(
  req: NextRequest,
  allowedRoles: UserRole[]
): Promise<SessionUser | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token) return null
  const session = await verifySession(token)
  if (!session || !allowedRoles.includes(session.role)) return null
  return session
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION_SECONDS,
    path: '/',
  })
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  })
}
