import React from 'react'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { InviteForm } from '@/modules/projects/components/InviteForm/InviteForm'
import { SubmissionFeed } from '@/modules/submissions/components/SubmissionFeed/SubmissionFeed'
import styles from './page.module.css'
import { ProjectHealthCard } from '@/modules/projects/components/ProjectHealthCard'

type Props = {
  params: Promise<{ id: string }>
}

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params
  const session = await getSession()

  if (!session) return null

  const project = await prisma.projects.findFirst({
    where: { id, ownerId: session.userId },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, fullName: true, email: true, role: true },
          },
        },
      },
      _count: {
        select: {
          submissions: true,
          milestones: true,
        },
      },
    },
  })

  if (!project) notFound()

  const totalMilestones = project._count.milestones
  const approvedCount = await prisma.milestones.count({
    where: { projectId: id, status: 'approved' },
  })
  const progress = totalMilestones > 0 ? Math.round((approvedCount / totalMilestones) * 100) : 0

  const budgetAgg = await prisma.milestones.aggregate({
    where: { projectId: id },
    _sum: { plannedCostTotal: true },
  })
  const totalAllocated = budgetAgg._sum.plannedCostTotal ?? 0

  // Tier 3: Calculate Actual Spend
  const spentAgg = await prisma.milestones.aggregate({
    where: { projectId: id },
    _sum: {
      tranche1Actual: true,
      tranche2Actual: true,
      tranche3Actual: true,
    }
  })
  const totalSpent = (spentAgg._sum.tranche1Actual ?? 0) + (spentAgg._sum.tranche2Actual ?? 0) + (spentAgg._sum.tranche3Actual ?? 0)

  return (
    <div className={styles.container}>
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>
            {project.totalBudget != null
              ? new Intl.NumberFormat('en-NG', {
                  style: 'currency',
                  currency: project.currency ?? 'NGN',
                  maximumFractionDigits: 0,
                }).format(project.totalBudget)
              : '—'}
          </span>
          <span className={styles.statLabel}>Total Budget</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{progress}%</span>
          <span className={styles.statLabel}>Complete</span>
          <div className={styles.statBar}>
            <div className={styles.statBarFill} style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{totalMilestones}</span>
          <span className={styles.statLabel}>Phases</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{project._count.submissions}</span>
          <span className={styles.statLabel}>Submissions</span>
        </div>
      </div>

      <div className={styles.statusCard}>
        <h3 className={styles.statusTitle}>Project Status</h3>
        <p className={styles.statusText}>
          {totalMilestones === 0
            ? 'No milestones configured yet. Set up your project phases and budgets.'
            : `${approvedCount} of ${totalMilestones} phases approved (${progress}% complete)`}
        </p>
        <div className={styles.statusTags}>
          <span className={styles.statusTag} data-type="status">{project.status}</span>
          <span className={styles.statusTag} data-type="build">{project.buildType || 'General'}</span>
          <span className={styles.statusTag} data-type="currency">{project.currency}</span>
        </div>
      </div>

      <div className={styles.grid2Col}>
        <div className={styles.gridCol}>
          <ProjectHealthCard 
            totalBudget={project.totalBudget ?? 0}
            spentAmount={totalSpent}
            totalPhases={totalMilestones}
            completedPhases={approvedCount}
            currency={project.currency}
          />
          <div style={{ marginTop: 'var(--space-lg)' }}>
            <a 
              href={`/api/projects/${id}/dossier`} 
              className={styles.downloadBtn}
              download
            >
              📥 Download Project Dossier (PDF)
            </a>
          </div>
          <InviteForm projectId={id} members={project.members} />
        </div>

        <div className={styles.gridCol}>
          <section className={styles.budgetCard}>
            <h2 className={styles.sectionTitle}>Budget Summary</h2>
            <div className={styles.budgetGrid}>
              <div className={styles.budgetItem}>
                <span className={styles.budgetLabel}>Total Budget</span>
                <span className={styles.budgetValue}>
                  {project.totalBudget != null
                    ? new Intl.NumberFormat('en-NG', { style: 'currency', currency: project.currency ?? 'NGN', maximumFractionDigits: 0 }).format(project.totalBudget)
                    : '—'}
                </span>
              </div>
              <div className={styles.budgetItem}>
                <span className={styles.budgetLabel}>Allocated</span>
                <span className={styles.budgetValue}>
                  {new Intl.NumberFormat('en-NG', { style: 'currency', currency: project.currency ?? 'NGN', maximumFractionDigits: 0 }).format(totalAllocated)}
                </span>
              </div>
              <div className={styles.budgetItem}>
                <span className={styles.budgetLabel}>Remaining</span>
                <span className={styles.budgetValue} data-type={project.totalBudget != null && totalAllocated > project.totalBudget ? 'over' : 'safe'}>
                  {project.totalBudget != null
                    ? new Intl.NumberFormat('en-NG', { style: 'currency', currency: project.currency ?? 'NGN', maximumFractionDigits: 0 }).format(Math.max(0, project.totalBudget - totalAllocated))
                    : '—'}
                </span>
              </div>
              <div className={styles.budgetItem}>
                <span className={styles.budgetLabel}>Phases</span>
                <span className={styles.budgetValue}>{totalMilestones}</span>
              </div>
            </div>
            {project.totalBudget != null && project.totalBudget > 0 && (
              <div className={styles.budgetSliderWrap}>
                <div className={styles.budgetSliderTrack}>
                  <div
                    className={styles.budgetSliderFill}
                    style={{ width: `${Math.min(100, Math.round((totalAllocated / project.totalBudget) * 100))}%` }}
                  />
                </div>
                <span className={styles.budgetSliderLabel}>
                  {Math.min(100, Math.round((totalAllocated / project.totalBudget) * 100))}% allocated
                </span>
              </div>
            )}
          </section>
        </div>
      </div>

      <Link href={`/dashboard/projects/${id}/phases`} className={styles.viewPhasesBtn}>
        View all phases &rarr;
      </Link>

      <SubmissionFeed projectId={id} />

      <NotificationCard sessionUserId={session.userId} />
    </div>
  )
}

function notificationTimestamp(createdAt: Date): string {
  // Use a stable date string for SSR to prevent hydration mismatch
  return createdAt.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
}

async function NotificationCard({ sessionUserId }: { sessionUserId: string }) {
  const notifications = await prisma.notifications.findMany({
    where: { userId: sessionUserId },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })

  return (
    <section className={styles.notifCard}>
      <h2 className={styles.sectionTitle}>Recent Notifications</h2>
      {notifications.length === 0 ? (
        <p className={styles.notifEmpty}>No notifications yet.</p>
      ) : (
        <div className={styles.notifList}>
          {notifications.map((n) => {
            return (
              <div key={n.id} className={styles.notifRow} data-unread={!n.readAt}>
                <div className={styles.notifDot} data-unread={!n.readAt} />
                <div className={styles.notifContent}>
                  <span className={styles.notifTitle}>{n.title}</span>
                  <span className={styles.notifBody}>{n.body}</span>
                </div>
                <span className={styles.notifTime}>{notificationTimestamp(n.createdAt)}</span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
