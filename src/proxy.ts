import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'

const OWNER_ROUTES = ['/dashboard', '/onboarding', '/projects', '/reports', '/billing', '/inspectors', '/settings']
const PROXY_ROUTES = ['/submit', '/proxy', '/field']
const CONTRACTOR_ROUTES = ['/site', '/contractor', '/field']
const PUBLIC_ROUTES = ['/', '/login', '/register', '/invite']
const PUBLIC_API_ROUTES = ['/api/auth/login', '/api/auth/register', '/api/auth/redeem']

export async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname

  const isPublic = PUBLIC_ROUTES.some(r => pathname.startsWith(r))
  if (isPublic) return NextResponse.next()

  const isPublicApi = PUBLIC_API_ROUTES.some(r => pathname.startsWith(r))
  if (isPublicApi) return NextResponse.next()

  const cookieToken = req.cookies.get('bw_session')?.value
  const session = cookieToken ? await verifySession(cookieToken) : null

  const debug = { pathname, hasCookie: !!cookieToken, hasSession: !!session, role: session?.role, method: req.method }
  console.log('[proxy]', JSON.stringify(debug))

  if (!session) {
    console.log('[proxy] no session, redirecting to /login')
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (OWNER_ROUTES.some(r => pathname.startsWith(r)) && session.role !== 'owner') {
    console.log('[proxy] owner route mismatch, redirecting')
    return NextResponse.redirect(new URL(`/login`, req.url))
  }
  
  // Routes allowed for both proxy and contractor roles
  const isFieldRoute = pathname.startsWith('/field')
  if (isFieldRoute && session.role !== 'proxy' && session.role !== 'contractor') {
    console.log('[proxy] field route mismatch, redirecting')
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Routes specific to proxies only
  const isProxyOnlyRoute = pathname.startsWith('/proxy') || pathname.startsWith('/submit')
  if (isProxyOnlyRoute && session.role !== 'proxy') {
    console.log('[proxy] proxy only route mismatch, redirecting')
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Routes specific to contractors only
  const isContractorOnlyRoute = pathname.startsWith('/site') || pathname.startsWith('/contractor')
  if (isContractorOnlyRoute && session.role !== 'contractor') {
    console.log('[proxy] contractor only route mismatch, redirecting')
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/payments/webhook).*)'],
}
