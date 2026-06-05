import { NextRequest } from 'next/server'
import { handleRedeemInvite } from '@/modules/auth/api/redeem'

export async function POST(req: NextRequest) {
  return handleRedeemInvite(req)
}
