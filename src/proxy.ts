import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'

const OWNER_ROUTES = ['/dashboard', '/onboarding', '/projects', '/reports', '/billing', '/inspectors', '/settings']
const FIELD_ROUTES = ['/field']
const CONTRACTOR_ROUTES = ['/contractor']
const PUBLIC_ROUTES = ['/', '/login', '/register', '/invite']
const PUBLIC_API_ROUTES = ['/api/auth/login', '/api/auth/register', '/api/auth/redeem']

export async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname

  if (PUBLIC_ROUTES.some(r => pathname.startsWith(r))) return NextResponse.next()
  if (PUBLIC_API_ROUTES.some(r => pathname.startsWith(r))) return NextResponse.next()

  const cookieToken = req.cookies.get('bw_session')?.value
  const session = cookieToken ? await verifySession(cookieToken) : null

  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (OWNER_ROUTES.some(r => pathname.startsWith(r)) && session.role !== 'owner') {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  
  if (FIELD_ROUTES.some(r => pathname.startsWith(r)) && session.role !== 'proxy' && session.role !== 'contractor') {
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
