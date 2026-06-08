import { NextRequest, NextResponse } from 'next/server'

export async function PUT(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }

  const { searchParams } = new URL(req.url)
  const key = searchParams.get('key')

  await new Promise(resolve => setTimeout(resolve, 500))

  return new NextResponse(null, { status: 200 })
}
