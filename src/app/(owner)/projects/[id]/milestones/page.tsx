import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getMilestones } from '@/modules/milestones/lib/getMilestones'
import { MilestoneConfigPanel } from '@/modules/milestones/components/MilestoneConfigPanel/MilestoneConfigPanel'

export const metadata: Metadata = {
  title: 'Configure Milestones — BuildWatch',
  description: 'Set planned budgets and payment schedules for each construction phase.',
}

type Props = {
  params: Promise<{ id: string }>
}

export default async function MilestoneConfigPage({ params }: Props) {
  // getSession() reads the httpOnly cookie and verifies the JWT — safe for Server Components
  const session = await getSession()

  if (!session || session.role !== 'owner') {
    redirect('/login')
  }

  const { id: projectId } = await params
  const result = await getMilestones(projectId, session.userId)

  if (!result.ok) {
    if (result.code === 'FORBIDDEN') redirect('/dashboard')
    // For internal errors, bubble to error boundary
    throw new Error(result.error)
  }

  return (
    <MilestoneConfigPanel
      projectId={projectId}
      milestones={result.data}
    />
  )
}
