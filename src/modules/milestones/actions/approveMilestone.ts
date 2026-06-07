'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { updateMilestoneStatus } from '../lib/updateMilestoneStatus'
import { notifyContractorMilestoneApproved } from '../../notifications/lib/dispatch'
import { logger } from '@/lib/logger'

export async function approveMilestoneAction(projectId: string, milestoneId: string) {
  const session = await getSession()
  if (!session || session.role !== 'owner') {
    return { error: 'Unauthorized' }
  }

  const result = await updateMilestoneStatus(milestoneId, projectId, session.userId, 'approved')

  if (result.ok) {
    revalidatePath(`/projects/${projectId}`)
    revalidatePath(`/projects/${projectId}/phases`)

    // Notify contractors in the background
    const owner = await prisma.users.findUnique({ where: { id: session.userId }, select: { fullName: true } })
    notifyContractorMilestoneApproved(milestoneId, projectId, owner?.fullName ?? 'Project Owner').catch(err => {
      logger.error('Contractor notification failed after approval', {
        module: 'notifications',
        milestoneId,
        error: { message: err.message },
      })
    })

    return { success: true }
  }

  return { error: result.error }
}
