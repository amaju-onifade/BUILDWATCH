import type { Metadata } from 'next'
import { prisma } from '@/lib/db'
import { requirePageUser } from '@/lib/page'
import MilestoneTimeline from '@/components/owner/MilestoneTimeline'

export const metadata: Metadata = {
  title: 'Milestones — BuildWatch',
  description: 'Track construction milestone progress, review submissions, and approve phases.',
}

export default async function MilestonesPage() {
  const user = await requirePageUser()

  const projects = await prisma.projects.findMany({
    where: { ownerId: user.userId },
    include: {
      milestones: { orderBy: { order: 'asc' } },
      submissions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          submittedBy: { select: { fullName: true } },
          milestone: { select: { id: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 1,
  })

  const project = projects[0] ?? null
  const latestSubmission = project?.submissions[0] ?? null

  return (
    <MilestoneTimeline
      userName={user.fullName}
      userInitials={user.initials}
      userPlan={user.plan}
      projectName={project?.name ?? 'My Project'}
      milestonesDb={project?.milestones ?? []}
      projectId={project?.id ?? null}
      latestSubmitter={latestSubmission?.submittedBy.fullName ?? ''}
      latestSubmissionDate={latestSubmission?.createdAt.toISOString() ?? ''}
      latestMilestoneId={latestSubmission?.milestone.id ?? ''}
    />
  )
}
