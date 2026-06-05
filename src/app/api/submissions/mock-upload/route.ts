import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export async function PUT(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const key = searchParams.get('key')

  // In a real mock we might save to disk, but for UI testing we'll just log and succeed
  logger.info('Mock photo upload received', { key })

  // Simulate a small delay
  await new Promise(resolve => setTimeout(resolve, 500))

  return new NextResponse(null, { status: 200 })
}
