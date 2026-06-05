import { prisma } from '@/lib/db'
import { ok, err, type Result } from '@/lib/result'
import { logger } from '@/lib/logger'
import type { UpdateMilestoneBudgetInput } from '../types'

/**
 * Updates the budget allocation for a single milestone.
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
        project: { select: { ownerId: true } },
      },
    })

    if (!milestone || milestone.project.ownerId !== requestingUserId) {
      return err('Forbidden', 'FORBIDDEN')
    }

    // Only allow budget edits on milestones that are not yet approved/locked
    if (['approved', 'locked'].includes(
      (await prisma.milestones.findUniqueOrThrow({ where: { id: milestoneId }, select: { status: true } })).status
    )) {
      return err('Cannot edit budget of an approved or locked milestone', 'MILESTONE_LOCKED')
    }

    await prisma.$transaction([
      prisma.milestones.update({
        where: { id: milestoneId },
        data: {
          plannedCostTotal: input.plannedCostTotal,
          paymentScheduleType: input.paymentScheduleType,
          tranche1Planned: input.tranche1Planned ?? null,
          tranche2Planned: input.tranche2Planned ?? null,
          tranche3Planned: input.tranche3Planned ?? null,
        },
      }),
      prisma.auditEvents.create({
        data: {
          eventType: 'MILESTONE_BUDGET_UPDATED',
          actorId: requestingUserId,
          resourceId: milestoneId,
          resourceType: 'milestone',
          projectId: milestone.projectId,
          metadata: {
            milestoneName: milestone.name,
            plannedCostTotal: input.plannedCostTotal,
            paymentScheduleType: input.paymentScheduleType,
          },
        },
      }),
    ])

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
