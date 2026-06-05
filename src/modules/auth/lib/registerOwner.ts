import { hash } from 'bcrypt'
import { prisma } from '@/lib/db'
import { createSession } from '@/lib/auth'
import { ok, err, type Result } from '@/lib/result'
import { logger } from '@/lib/logger'

const TRIAL_DURATION_DAYS = 21
const BCRYPT_ROUNDS = 12

export interface RegisterOwnerInput {
  email: string
  password: string
  fullName: string
}

export async function registerOwner(input: RegisterOwnerInput): Promise<Result<{ userId: string; token: string }>> {
  try {
    const existing = await prisma.users.findUnique({ where: { email: input.email.toLowerCase().trim() } })
    if (existing) return err('An account with this email already exists.', 'EMAIL_TAKEN')

    const passwordHash = await hash(input.password, BCRYPT_ROUNDS)

    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DURATION_DAYS)

    const { user } = await prisma.$transaction(async tx => {
      const user = await tx.users.create({
        data: {
          email: input.email.toLowerCase().trim(),
          passwordHash,
          fullName: input.fullName.trim(),
          role: 'owner',
        },
      })

      await tx.subscriptions.create({
        data: {
          userId: user.id,
          status: 'trialing',
          planId: null,
          trialEndsAt,
        },
      })

      await tx.auditEvents.create({
        data: {
          eventType: 'USER_REGISTERED',
          actorId: user.id,
          resourceId: user.id,
          resourceType: 'user',
          projectId: null,
        },
      })

      return { user }
    })

    const token = await createSession({ userId: user.id, role: 'owner' })

    return ok({ userId: user.id, token })
  } catch (error) {
    logger.error('Failed to register owner', { module: 'auth', error: { message: (error as Error).message } })
    return err('Something went wrong during registration', 'INTERNAL_ERROR')
  }
}
