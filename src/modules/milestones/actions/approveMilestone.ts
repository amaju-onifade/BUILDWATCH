'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { updateMilestoneStatus } from '../lib/updateMilestoneStatus'

export async function approveMilestoneAction(projectId: string, milestoneId: string) {
  const session = await getSession()
  if (!session || session.role !== 'owner') {
    return { error: 'Unauthorized' }
  }

  const result = await updateMilestoneStatus(milestoneId, projectId, session.userId, 'approved')
  
  if (result.ok) {
    revalidatePath(`/dashboard/projects/${projectId}`)
    revalidatePath(`/dashboard/projects/${projectId}/phases`)
    return { success: true }
  }

  return { error: result.error }
}
