import { NextRequest } from 'next/server'
import { handleFlutterwaveWebhook } from '@/modules/payments/api/webhook'

export async function POST(req: NextRequest) {
  return handleFlutterwaveWebhook(req)
}
