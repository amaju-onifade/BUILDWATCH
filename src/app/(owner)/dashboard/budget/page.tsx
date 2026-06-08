import type { Metadata } from 'next'
import { requirePageUser } from '@/lib/page'
import { prisma } from '@/lib/db'
import BudgetTracker from '@/components/owner/BudgetTracker'

export const metadata: Metadata = {
  title: 'Budget Tracker — BuildWatch',
  description: 'Track milestone-level spend, planned vs actual variance, and budget remaining.',
}

export default async function BudgetPage() {
  const user = await requirePageUser()

  const projects = await prisma.projects.findMany({
    where: { ownerId: user.userId },
    include: { milestones: { orderBy: { order: 'asc' } } },
    orderBy: { createdAt: 'desc' },
    take: 1,
  })

  const project = projects[0] ?? null

  return (
    <BudgetTracker
      userName={user.fullName}
      userInitials={user.initials}
      userPlan={user.plan}
      projectName={project?.name ?? 'My Project'}
      totalBudget={project?.totalBudget ?? 0}
      milestonesDb={project?.milestones ?? []}
    />
  )
}
