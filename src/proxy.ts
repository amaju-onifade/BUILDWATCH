import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'

const OWNER_ROUTES = ['/dashboard', '/projects', '/reports', '/billing']
const PROXY_ROUTES = ['/submit', '/proxy']
const CONTRACTOR_ROUTES = ['/site', '/contractor']
const PUBLIC_ROUTES = ['/login', '/register', '/invite']
const PUBLIC_API_ROUTES = ['/api/auth/login', '/api/auth/register', '/api/auth/redeem']

export async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname

  if (pathname === '/') {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const isPublic = PUBLIC_ROUTES.some(r => pathname.startsWith(r))
  if (isPublic) return NextResponse.next()

  const isPublicApi = PUBLIC_API_ROUTES.some(r => pathname.startsWith(r))
  if (isPublicApi) return NextResponse.next()

  const token = req.cookies.get('bw_session')?.value
  const session = token ? await verifySession(token) : null

  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (OWNER_ROUTES.some(r => pathname.startsWith(r)) && session.role !== 'owner') {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  if (PROXY_ROUTES.some(r => pathname.startsWith(r)) && session.role !== 'proxy') {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  if (CONTRACTOR_ROUTES.some(r => pathname.startsWith(r)) && session.role !== 'contractor') {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/payments/webhook).*)'],
}
