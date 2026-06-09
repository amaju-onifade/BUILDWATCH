import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import OwnerDashboard from '@/components/owner/OwnerDashboard'
import type { DashboardData } from '@/components/owner/OwnerDashboard'

function fmt(n: number): string {
  return `₦${n.toLocaleString()}`
}

function daysAgo(d: Date): number {
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24))
}

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const allProjects = await prisma.projects.findMany({
    where: { ownerId: session.userId },
    select: { id: true, name: true },
    orderBy: { createdAt: 'desc' },
  })

  const projects = await prisma.projects.findMany({
    where: { ownerId: session.userId },
    orderBy: { createdAt: 'desc' },
    take: 1,
    include: {
      milestones: { orderBy: { order: 'asc' }, select: { id: true, name: true, order: true, status: true } },
      submissions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: { submittedBy: { select: { fullName: true } } },
      },
    },
  })

  if (projects.length === 0) {
    return <OwnerDashboard data={{
      projectId: '',
      projectName: 'No project yet',
      daysSinceLastUpdate: 0,
      lastSubmittedBy: '—',
      lastSubmissionDate: '—',
      currentPhase: '—',
      currentPhaseNumber: 0,
      totalPhases: 0,
      progressPercent: 0,
      estimatedCompletion: '—',
      totalBudget: '₦0',
      budgetRemaining: '₦0',
      actionsRequired: 0,
      actionsDetail: 'Create your first project to get started',
      aiAnomalyFlagged: false,
      aiAnomalyMessage: '',
    }} projects={allProjects} />
  }

  const project = projects[0]
  const milestones = project.milestones
  const latestSubmission = project.submissions[0] ?? null

  const activeMilestone = milestones.find(m => m.status === 'in_progress' || m.status === 'under_review')
  const approvedCount = milestones.filter(m => m.status === 'approved').length
  const progressPercent = milestones.length > 0 ? Math.round((approvedCount / milestones.length) * 100) : 0

  const daysSinceLastUpdate = latestSubmission ? daysAgo(latestSubmission.createdAt) : 99

  const actionsRequired = milestones.filter(m => m.status === 'under_review').length
  const actionsReview = milestones.filter(m => m.status === 'under_review').length
  const actionsPending = milestones.filter(m => m.status === 'pending' || m.status === 'in_progress').length

  const data: DashboardData = {
    projectId: project.id,
    projectName: project.name,
    daysSinceLastUpdate,
    lastSubmittedBy: latestSubmission?.submittedBy.fullName ?? '—',
    lastSubmissionDate: latestSubmission
      ? latestSubmission.createdAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : '—',
    currentPhase: activeMilestone?.name ?? (milestones.length > 0 ? milestones[milestones.length - 1].name : '—'),
    currentPhaseNumber: activeMilestone?.order ?? approvedCount + 1,
    totalPhases: milestones.length,
    progressPercent,
    estimatedCompletion: '—',
    totalBudget: project.totalBudget ? fmt(project.totalBudget) : '₦0',
    budgetRemaining: project.totalBudget ? fmt(project.totalBudget) : '₦0',
    actionsRequired,
    actionsDetail: `${actionsReview > 0 ? `${actionsReview} review` : ''}${actionsReview > 0 && actionsPending > 0 ? ' · ' : ''}${actionsPending > 0 ? `${actionsPending} pending` : ''}`,
    aiAnomalyFlagged: false,
    aiAnomalyMessage: '',
  }

  return <OwnerDashboard data={data} projects={allProjects} />
}
