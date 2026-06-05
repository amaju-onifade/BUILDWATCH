import { NextRequest } from 'next/server'
import { handleRegisterOwner } from '@/modules/auth/api/register'

export async function POST(req: NextRequest) {
  return handleRegisterOwner(req)
}
