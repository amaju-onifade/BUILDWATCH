import { NextRequest } from 'next/server'
import { handleHeartbeatCron } from '@/modules/notifications/api/heartbeatCron'

export async function GET(req: NextRequest) {
  return handleHeartbeatCron(req)
}
