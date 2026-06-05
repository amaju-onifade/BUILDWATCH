import { nanoid } from 'nanoid'
import { prisma } from '@/lib/db'
import { ok, err, type Result } from '@/lib/result'
import { logger } from '@/lib/logger'

export type MilestoneStatus = 'pending' | 'in_progress' | 'under_review' | 'approved' | 'locked'

/**
 * Updates a milestone's status and records an audit event.
 * Validates ownership before proceeding.
 */
export async function updateMilestoneStatus(
  milestoneId: string,
  projectId: string,
  ownerId: string,
  newStatus: MilestoneStatus
): Promise<Result<{ id: string; status: MilestoneStatus }>> {
  try {
    // 1. Ownership and existence check
    const milestone = await prisma.milestones.findFirst({
      where: {
        id: milestoneId,
        project: {
          id: projectId,
          ownerId: ownerId,
        },
      },
    })

    if (!milestone) {
      return err('Milestone not found or access denied', 'FORBIDDEN')
    }

    // 2. State transition validation (optional: can add rules here)
    if (milestone.status === 'locked' && newStatus !== 'locked') {
       return err('Cannot modify a locked milestone', 'LOCKED')
    }

    // 3. Atomically update status and create audit trail
    const updated = await prisma.$transaction(async (tx) => {
      const m = await tx.milestones.update({
        where: { id: milestoneId },
        data: { status: newStatus },
      })

      await tx.auditEvents.create({
        data: {
          id: nanoid(),
          actorId: ownerId,
          projectId,
          eventType: 'MILESTONE_STATUS_UPDATED',
          resourceId: milestoneId,
          resourceType: 'milestone',
          metadata: {
            oldStatus: milestone.status,
            newStatus,
          },
        },
      })

      return m
    })

    logger.info('Milestone status updated', {
      module: 'milestones',
      milestoneId,
      newStatus,
      ownerId,
    })

    return ok({ id: updated.id, status: updated.status as MilestoneStatus })

  } catch (error) {
    logger.error('Failed to update milestone status', {
      module: 'milestones',
      milestoneId,
      error: { message: (error as Error).message },
    })
    return err('Internal server error')
  }
}
