import { nanoid } from 'nanoid'
import { prisma } from '@/lib/db'
import { ok, err, type Result } from '@/lib/result'
import { logger } from '@/lib/logger'
import { signAuditEvent } from '../../audit-trail/lib/security'

export type MilestoneStatus = 'pending' | 'in_progress' | 'under_review' | 'approved' | 'locked'

/**
 * Updates a milestone's status and records an audit event.
 * Validates ownership and enforces strict linear transitions.
 * If approved, automatically unlocks the next milestone in sequence.
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
        order: true,
        name: true,
      }
    })

    if (!milestone) {
      return err('Milestone not found or access denied', 'FORBIDDEN')
    }

    const currentStatus = milestone.status as MilestoneStatus

    // 2. Validate linear transitions
    // - approved/locked milestones cannot be reverted (safety/audit trail requirement)
    if (currentStatus === 'approved' || currentStatus === 'locked' && newStatus !== 'pending') {
       // Note: 'locked' can only move to 'pending' via the 'unlock' logic (previous milestone approval)
       if (currentStatus === 'locked' && newStatus !== 'pending') {
          return err('Cannot manually activate a locked milestone. Approve the previous milestone first.', 'LOCKED')
       }
       if (currentStatus === 'approved') {
          return err('This milestone is already approved and locked.', 'LOCKED')
       }
    }

    // 3. Atomically update status and handle chaining
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

      // Verification Receipt LOG
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

      // 4. AUTOMATIC UNLOCKING: If this one was approved, unlock the next one
      if (newStatus === 'approved') {
        const nextMilestone = await tx.milestones.findFirst({
          where: {
            projectId,
            order: { gt: milestone.order },
          },
          orderBy: { order: 'asc' },
        })

        if (nextMilestone && nextMilestone.status === 'locked') {
          await tx.milestones.update({
            where: { id: nextMilestone.id },
            data: { status: 'pending' },
          })

          const unlockDate = new Date()
          await tx.auditEvents.create({
            data: {
              id: nanoid(),
              actorId: ownerId, // System event but triggered by owner's approval
              projectId,
              eventType: 'MILESTONE_UNLOCKED',
              resourceId: nextMilestone.id,
              resourceType: 'milestone',
              metadata: {
                previousMilestoneId: milestoneId,
                nextMilestoneName: nextMilestone.name,
              },
              createdAt: unlockDate,
              signature: signAuditEvent({
                actorId: ownerId,
                eventType: 'MILESTONE_UNLOCKED',
                resourceId: nextMilestone.id,
                createdAt: unlockDate
              })
            } as any,
          })
        }
      }

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
