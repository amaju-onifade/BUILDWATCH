import { nanoid } from 'nanoid'
import { prisma } from '@/lib/db'
import { ok, err, type Result } from '@/lib/result'
import { logger } from '@/lib/logger'
import { signAuditEvent } from '../../audit-trail/lib/security'

export type MilestoneStatus = 'pending' | 'in_progress' | 'under_review' | 'approved' | 'locked'

/**
 * Updates a milestone's status and records an audit event.
 * Validates ownership. Allows parallel work — any milestone can be started independently.
 * Once approved, a milestone cannot be reverted.
 */
export async function updateMilestoneStatus(
  milestoneId: string,
  projectId: string,
  ownerId: string,
  newStatus: MilestoneStatus
): Promise<Result<{ id: string; status: MilestoneStatus }>> {
  try {
    // 1. Fetch current state and project context
    const milestone = await prisma.milestones.findFirst({
      where: {
        id: milestoneId,
        projectId,
        project: { ownerId },
      },
      select: {
        id: true,
        status: true,
        name: true,
      }
    })

    if (!milestone) {
      return err('Milestone not found or access denied', 'FORBIDDEN')
    }

    const currentStatus = milestone.status as MilestoneStatus

    // 2. Approved milestones cannot be reverted
    if (currentStatus === 'approved') {
      return err('This milestone is already approved and cannot be changed.', 'LOCKED')
    }

    // 3. Atomically update status
    const updated = await prisma.$transaction(async (tx) => {
      const updateData: any = { status: newStatus }

      // If approving, set timestamps
      if (newStatus === 'approved') {
        updateData.approvedAt = new Date()
        updateData.completedAt = new Date()
        updateData.approvedById = ownerId
      }

      const m = await tx.milestones.update({
        where: { id: milestoneId },
        data: updateData,
      })

      // Audit event
      const eventDate = new Date()
      await tx.auditEvents.create({
        data: {
          id: nanoid(),
          actorId: ownerId,
          projectId,
          eventType: 'MILESTONE_STATUS_UPDATED',
          resourceId: milestoneId,
          resourceType: 'milestone',
          metadata: {
            oldStatus: currentStatus,
            newStatus,
            milestoneName: milestone.name,
            isApprovalReceipt: newStatus === 'approved'
          },
          createdAt: eventDate,
          signature: signAuditEvent({ 
            actorId: ownerId, 
            eventType: 'MILESTONE_STATUS_UPDATED', 
            resourceId: milestoneId, 
            createdAt: eventDate 
          }),
        } as any,
      })

      return m
    })

    logger.info(`Milestone ${newStatus === 'approved' ? 'APPROVED' : 'UPDATED'}`, {
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
    return err('Internal server error', 'INTERNAL_ERROR')
  }
}
