import { prisma } from '@/lib/db'
import { ok, err, type Result } from '@/lib/result'
import { logger } from '@/lib/logger'
import type { UpdateMilestoneBudgetInput } from '../types'
import { signAuditEvent } from '../../audit-trail/lib/security'
import { nanoid } from 'nanoid'

/**
 * Updates the budget allocation for a single milestone.
 * Can also mark the milestone as completed (approved) in the same request.
 * When approving, auto-unlocks the next milestone (locked → pending) if one exists.
 * Confirms the requesting user owns the parent project before writing.
 * Writes an audit event in the same transaction as the budget update.
 */
export async function updateMilestoneBudget(
  milestoneId: string,
  input: UpdateMilestoneBudgetInput,
  requestingUserId: string
): Promise<Result<{ milestoneId: string }>> {
  try {
    // Confirm ownership via a join — never trust the milestoneId alone
    const milestone = await prisma.milestones.findFirst({
      where: { id: milestoneId },
      select: {
        id: true,
        projectId: true,
        name: true,
        status: true,
        order: true,
        project: { select: { ownerId: true } },
      },
    })

    if (!milestone || milestone.project.ownerId !== requestingUserId) {
      return err('Forbidden', 'FORBIDDEN')
    }

    // Only allow budget edits on milestones that are not yet approved or locked
    if (milestone.status === 'approved' || milestone.status === 'locked') {
      return err('Cannot edit budget of a locked milestone', 'MILESTONE_LOCKED')
    }

    await prisma.$transaction(async (tx) => {
      const updateData: any = {
        plannedCostTotal: input.plannedCostTotal,
        paymentScheduleType: input.paymentScheduleType,
        tranche1Planned: input.tranche1Planned ?? null,
        tranche2Planned: input.tranche2Planned ?? null,
        tranche3Planned: input.tranche3Planned ?? null,
      }

      const isApproving = input.status === 'approved'
      const eventDate = new Date()

      // If marking as completed, set approval timestamps
      if (isApproving) {
        updateData.status = 'approved'
        updateData.approvedAt = eventDate
        updateData.completedAt = eventDate
        updateData.approvedById = requestingUserId

        // Auto-unlock the next milestone
        const nextMilestone = await tx.milestones.findFirst({
          where: {
            projectId: milestone.projectId,
            order: milestone.order + 1,
            status: { in: ['pending', 'locked'] },
          },
          select: { id: true, name: true },
        })

        if (nextMilestone) {
          await tx.milestones.update({
            where: { id: nextMilestone.id },
            data: { status: 'pending' },
          })

          await tx.auditEvents.create({
            data: {
              id: nanoid(),
              eventType: 'MILESTONE_UNLOCKED',
              actorId: requestingUserId,
              resourceId: nextMilestone.id,
              resourceType: 'milestone',
              projectId: milestone.projectId,
              metadata: {
                milestoneName: nextMilestone.name,
                unlockedByApprovalOf: milestone.name,
              },
              createdAt: eventDate,
              signature: signAuditEvent({
                actorId: requestingUserId,
                eventType: 'MILESTONE_UNLOCKED',
                resourceId: nextMilestone.id,
                createdAt: eventDate,
              }),
            } as any,
          })
        }
      }

      await tx.milestones.update({
        where: { id: milestoneId },
        data: updateData,
      })

      const auditEventType = isApproving
        ? 'MILESTONE_APPROVED'
        : 'MILESTONE_BUDGET_UPDATED'

      await tx.auditEvents.create({
        data: {
          id: nanoid(),
          eventType: auditEventType,
          actorId: requestingUserId,
          resourceId: milestoneId,
          resourceType: 'milestone',
          projectId: milestone.projectId,
          metadata: {
            milestoneName: milestone.name,
            plannedCostTotal: input.plannedCostTotal,
            paymentScheduleType: input.paymentScheduleType,
            ...(isApproving && { wasCompletedOnCreation: true }),
          },
          createdAt: eventDate,
          signature: signAuditEvent({
            actorId: requestingUserId,
            eventType: auditEventType,
            resourceId: milestoneId,
            createdAt: eventDate
          })
        } as any,
      })
    })

    return ok({ milestoneId })
  } catch (error) {
    logger.error('Failed to update milestone budget', {
      module: 'milestones',
      milestoneId,
      error: { message: (error as Error).message },
    })
    return err('Failed to update milestone budget', 'INTERNAL_ERROR')
  }
}
