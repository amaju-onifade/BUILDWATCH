import { jwtVerify } from 'jose'
import { hash } from 'bcrypt'
import { prisma } from '@/lib/db'
import { createSession } from '@/lib/auth'
import { config } from '@/lib/config'
import { ok, err, type Result } from '@/lib/result'
import { logger } from '@/lib/logger'

const BCRYPT_ROUNDS = 12

export async function redeemInvite(params: {
  token: string
  fullName: string
  password: string
}): Promise<Result<{ token: string }>> {
  try {
    const secret = new TextEncoder().encode(config.jwtSecret)

    // 1. Verify JWT signature and expiry
    let payload: { inviteId: string; projectId: string; role: string; email: string }
    try {
      const { payload: p } = await jwtVerify(params.token, secret, { algorithms: ['HS256'] })
      payload = p as typeof payload
    } catch {
      return err('This invite link is not valid.', 'INVITE_INVALID')
    }

    // 2. Check database record — source of truth
    const invite = await prisma.inviteTokens.findUnique({
      where: { id: payload.inviteId },
    })

    if (!invite) return err('This invite link could not be found.', 'INVITE_NOT_FOUND')
    if (invite.status !== 'pending') return err('This invite link has already been used. Ask the owner for a new one.', 'INVITE_ALREADY_USED')
    if (invite.expiresAt < new Date()) return err('This invite link has expired. Ask the owner to send a new one.', 'INVITE_EXPIRED')
    if (invite.role !== 'proxy' && invite.role !== 'contractor') return err('This invite link is not valid.', 'INVITE_INVALID')

    // 3. Create user and assign to project atomically
    const passwordHash = await hash(params.password, BCRYPT_ROUNDS)

    const { user } = await prisma.$transaction(async tx => {
      // Check if user already exists (re-invite scenario)
      let user = await tx.users.findUnique({
        where: { email: invite.inviteeEmail },
      })

      if (user && user.role !== invite.role) throw new Error('ROLE_CONFLICT')

      if (!user) {
        user = await tx.users.create({
          data: {
            email: invite.inviteeEmail, // email already trimmed in generation
            passwordHash,
            fullName: params.fullName.trim(),
            role: invite.role as 'proxy' | 'contractor',
          },
        })
      }

      // Assign to project
      const existingMember = await tx.projectMembers.findUnique({
        where: {
          projectId_userId: { projectId: invite.projectId, userId: user.id }
        }
      })
      if (!existingMember) {
        await tx.projectMembers.create({
          data: {
            projectId: invite.projectId,
            userId: user.id,
            role: invite.role,
          },
        })
      }

      // Consume the invite — mark as used, not deleted
      await tx.inviteTokens.update({
        where: { id: invite.id },
        data: { status: 'consumed', consumedAt: new Date(), consumedByUserId: user.id },
      })

      await tx.auditEvents.create({
        data: {
          eventType: 'INVITE_REDEEMED',
          actorId: user.id,
          resourceId: invite.id,
          resourceType: 'invite',
          projectId: invite.projectId,
        },
      })

      return { user }
    })

    const sessionToken = await createSession({
      userId: user.id,
      role: user.role as 'proxy' | 'contractor',
    })

    return ok({ token: sessionToken })
  } catch (error) {
    if ((error as Error).message === 'ROLE_CONFLICT') {
      return err('An account with this email already exists but has a different role. Please contact support.', 'ROLE_CONFLICT')
    }
    logger.error('Failed to redeem invite', { module: 'auth', error: { message: (error as Error).message } })
    return err('Something went wrong during invite redemption', 'INTERNAL_ERROR')
  }
}
