import { compare } from 'bcrypt'
import { prisma } from '@/lib/db'
import { createSession } from '@/lib/auth'
import { ok, err, type Result } from '@/lib/result'
import { logger } from '@/lib/logger'

export async function loginUser(email: string, password: string): Promise<Result<{ userId: string; token: string; role: string }>> {
  try {
    const user = await prisma.users.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true, passwordHash: true, role: true, deletedAt: true },
    })

    const dummyHash = '$2b$12$ZMyqqYcmmB5jK2BeZuk0TeuKgoQLPlEtbZI.mqM2M7U8nwloEBC/a'
    const passwordMatch = await compare(password, user?.passwordHash ?? dummyHash)

    if (!user || !passwordMatch || user.deletedAt) {
      return err('Email or password is incorrect.', 'INVALID_CREDENTIALS')
    }

    const token = await createSession({ userId: user.id, role: user.role as 'owner' | 'proxy' | 'contractor' })

    return ok({ userId: user.id, token, role: user.role })
  } catch (error) {
    logger.error('Failed to log in user', { module: 'auth', error: { message: (error as Error).message } })
    return err('Something went wrong during login', 'INTERNAL_ERROR')
  }
}
