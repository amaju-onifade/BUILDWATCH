import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({ data: { success: true } }, { status: 200 })
  response.cookies.set('bw_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  })
  return response
}
