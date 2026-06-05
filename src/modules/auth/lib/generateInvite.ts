import { SignJWT } from 'jose'
import { prisma } from '@/lib/db'
import { createId } from '@paralleldrive/cuid2'
import { config } from '@/lib/config'
import { ok, err, type Result } from '@/lib/result'
import { logger } from '@/lib/logger'

const INVITE_TTL_HOURS = 72

export async function generateInviteLink(params: {
  projectId: string
  ownerUserId: string
  inviteeEmail: string
  role: 'proxy' | 'contractor'
}): Promise<Result<string>> {
  try {
    // Confirm the owner actually owns this project
    const project = await prisma.projects.findFirst({
      where: { id: params.projectId, ownerId: params.ownerUserId },
      select: { id: true, name: true },
    })
    if (!project) return err('You do not have permission for this project', 'FORBIDDEN')

    // Invalidate any existing pending invite for this email + project + role
    await prisma.inviteTokens.updateMany({
      where: {
        projectId: params.projectId,
        inviteeEmail: params.inviteeEmail.toLowerCase(),
        role: params.role,
        status: 'pending',
      },
      data: { status: 'invalidated' },
    })

    const inviteId = createId()
    const expiresAt = new Date(Date.now() + INVITE_TTL_HOURS * 60 * 60 * 1000)

    await prisma.inviteTokens.create({
      data: {
        id: inviteId,
        projectId: params.projectId,
        invitedByUserId: params.ownerUserId,
        inviteeEmail: params.inviteeEmail.toLowerCase().trim(),
        role: params.role,
        status: 'pending',
        expiresAt,
      },
    })

    const secret = new TextEncoder().encode(config.jwtSecret)
    const token = await new SignJWT({
      inviteId,
      projectId: params.projectId,
      role: params.role,
      email: params.inviteeEmail.toLowerCase(),
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime(expiresAt.toISOString())
      .sign(secret)

    const inviteUrl = `${config.appUrl}/invite/${encodeURIComponent(token)}`
    return ok(inviteUrl)
  } catch (error) {
    logger.error('Failed to generate invite', { module: 'auth', projectId: params.projectId, error: { message: (error as Error).message } })
    return err('Failed to generate invite link', 'INTERNAL_ERROR')
  }
}
