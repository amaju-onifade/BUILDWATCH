'use server'
import { prisma } from '@/lib/db'
import { sendChaseProxyNotification } from '../lib/dispatch'
import { logger } from '@/lib/logger'

/**
 * Server Action for owners to manually chase a proxy for a project update.
 */
export async function chaseProxyAction(projectId: string, ownerId: string) {
  try {
    // 1. Validate ownership
    const project = await prisma.projects.findFirst({
      where: { id: projectId, ownerId },
      include: { owner: { select: { fullName: true } } },
    })

    if (!project) {
      return { ok: false, error: 'Forbidden' }
    }

    // 2. Trigger notification
    await sendChaseProxyNotification(projectId, project.owner.fullName)

    return { ok: true }
  } catch (error) {
    logger.error('Chase proxy action failed', {
      module: 'notifications',
      projectId,
      ownerId,
      error: { message: (error as Error).message },
    })
    return { ok: false, error: 'Something went wrong' }
  }
}
