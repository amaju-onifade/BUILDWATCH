import type { Metadata } from 'next'
import { prisma } from '@/lib/db'
import { requirePageUser } from '@/lib/page'
import PhotoLog from '@/components/owner/PhotoLog'

export const metadata: Metadata = {
  title: 'Photo Log — BuildWatch',
  description: 'Browse all photo submissions with AI analysis and annotation tools.',
}

export default async function PhotosPage() {
  const user = await requirePageUser()

  const projects = await prisma.projects.findMany({
    where: { ownerId: user.userId },
    orderBy: { createdAt: 'desc' },
    take: 1,
    include: {
      milestones: { orderBy: { order: 'asc' }, select: { id: true, name: true, order: true } },
      submissions: {
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          submittedBy: { select: { fullName: true } },
          milestone: { select: { name: true, order: true } },
          photos: { select: { id: true } },
          aiReport: true,
        },
      },
    },
  })

  const project = projects[0] ?? null
  const submissions = project?.submissions ?? []
  const milestones = project?.milestones ?? []

  return (
    <PhotoLog
      userName={user.fullName}
      userInitials={user.initials}
      userPlan={user.plan}
      projectName={project?.name ?? 'My Project'}
      submissionsDb={submissions.map(s => ({
        id: s.id,
        submitterName: s.submittedBy.fullName,
        createdAt: s.createdAt.toISOString(),
        milestoneName: s.milestone.name,
        milestonePhase: s.milestone.order,
        photoCount: s.photos.length,
        aiReport: s.aiReport ? {
          s1_visible: s.aiReport.overallAssessment ?? '',
          s2_assessment: s.aiReport.progressIndicator ?? '',
          s2_confidence: (s.aiReport.confidenceLevel as 'High' | 'Medium' | 'Low') || 'Medium',
          s3_anomalies: Array.isArray(s.aiReport.concerns) ? (s.aiReport.concerns as string[]) : [],
          s4_limitations: typeof s.aiReport.limitations === 'string' ? s.aiReport.limitations : '',
          s5_reference: null,
        } : null,
        anomalyCount: Array.isArray(s.aiReport?.concerns) ? (s.aiReport!.concerns as string[]).length : 0,
      }))}
      milestonesDb={milestones}
    />
  )
}
