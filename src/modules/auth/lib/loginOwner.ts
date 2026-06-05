import { compare } from 'bcrypt'
import { prisma } from '@/lib/db'
import { createSession } from '@/lib/auth'
import { ok, err, type Result } from '@/lib/result'
import { logger } from '@/lib/logger'

export async function loginOwner(email: string, password: string): Promise<Result<{ userId: string; token: string }>> {
  try {
    const user = await prisma.users.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true, passwordHash: true, role: true, deletedAt: true },
    })

    // Constant-time comparison path — always compare even if user not found
    // to prevent user enumeration via timing
    const dummyHash = '$2a$12$dummy.hash.to.prevent.timing.attacks.xxxxxxxxxx'
    const passwordMatch = await compare(password, user?.passwordHash ?? dummyHash)

    if (!user || !passwordMatch || user.deletedAt) {
      return err('Email or password is incorrect.', 'INVALID_CREDENTIALS')
    }

    if (user.role !== 'owner') {
      // Proxies and contractors use the invite flow, not the main login
      return err('Email or password is incorrect.', 'INVALID_CREDENTIALS')
    }

    const token = await createSession({ userId: user.id, role: 'owner' })

    return ok({ userId: user.id, token })
  } catch (error) {
    logger.error('Failed to log in owner', { module: 'auth', error: { message: (error as Error).message } })
    return err('Something went wrong during login', 'INTERNAL_ERROR')
  }
}
