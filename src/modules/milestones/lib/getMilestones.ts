import { prisma } from '@/lib/db'
import { ok, err, type Result } from '@/lib/result'
import { logger } from '@/lib/logger'
import type { MilestoneRow } from '../types'

/**
 * Fetches all milestones for a project, ordered by their sequence number.
 * Confirms the requesting user is the project owner before returning data.
 */
export async function getMilestones(
  projectId: string,
  requestingUserId: string
): Promise<Result<MilestoneRow[]>> {
  try {
    // Re-query to confirm ownership — never trust client-supplied IDs
    const project = await prisma.projects.findFirst({
      where: { id: projectId, ownerId: requestingUserId },
      select: { id: true },
    })

    if (!project) {
      return err('Forbidden', 'FORBIDDEN')
    }

    const milestones = await prisma.milestones.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        name: true,
        order: true,
        status: true,
        plannedCostTotal: true,
        paymentScheduleType: true,
        tranche1Planned: true,
        tranche2Planned: true,
        tranche3Planned: true,
        currency: true,
        startDate: true,
        completedAt: true,
        approvedAt: true,
      },
    })

    return ok(milestones as MilestoneRow[])
  } catch (error) {
    logger.error('Failed to fetch milestones', {
      module: 'milestones',
      projectId,
      error: { message: (error as Error).message },
    })
    return err('Failed to fetch milestones', 'INTERNAL_ERROR')
  }
}
