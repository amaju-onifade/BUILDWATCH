import { NextRequest } from 'next/server'
import { handleWeeklyDigestCron } from '@/modules/notifications/api/weeklyDigestCron'

export async function GET(req: NextRequest) {
  return handleWeeklyDigestCron(req)
}
