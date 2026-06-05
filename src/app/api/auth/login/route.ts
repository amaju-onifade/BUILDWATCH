import { NextRequest } from 'next/server'
import { handleLoginOwner } from '@/modules/auth/api/login'

export async function POST(req: NextRequest) {
  return handleLoginOwner(req)
}
