import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Dashboard — BuildWatch',
  description: 'Overview of all your construction projects.',
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  completed: 'Completed',
  on_hold: 'On hold',
  archived: 'Archived',
}

export default async function DashboardPage() {
  const session = await getSession()
  if (!session || session.role !== 'owner') redirect('/login')

  const projects = await prisma.projects.findMany({
    where: { ownerId: session.userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      name: true,
      location: true,
      buildType: true,
      totalBudget: true,
      currency: true,
      status: true,
      createdAt: true,
      _count: {
        select: {
          milestones: true,
          submissions: true,
        },
      },
    },
  })

  const approvedCounts = await Promise.all(
    projects.map(p =>
      prisma.milestones.count({
        where: { projectId: p.id, status: 'approved' },
      })
    )
  )

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Your Projects</h1>
          <p className={styles.pageSubtitle}>
            {projects.length === 0
              ? 'No projects yet — create your first one below.'
              : `${projects.length} project${projects.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Link href="/dashboard/projects/new" className={styles.newProjectBtn} id="btn-new-project">
          + New project
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon} aria-hidden="true">🏗️</div>
          <p className={styles.emptyTitle}>No projects yet</p>
          <p className={styles.emptyDesc}>
            Create your first project to start tracking construction milestones with your team.
          </p>
          <Link href="/dashboard/projects/new" className={styles.emptyAction} id="btn-create-first-project">
            Create a project
          </Link>
        </div>
      ) : (
        <ol className={styles.projectList}>
          {projects.map((project, idx) => {
            const total = project._count.milestones
            const approved = approvedCounts[idx]
            const progress = total > 0 ? Math.round((approved / total) * 100) : 0

            return (
              <li key={project.id} className={styles.projectCard}>
                <a
                  href={`/dashboard/projects/${project.id}`}
                  className={styles.cardLink}
                  id={`project-card-${project.id}`}
                >
                  <div className={styles.cardTop}>
                    <div className={styles.cardInfo}>
                      <span className={styles.projectName}>{project.name}</span>
                      <span className={styles.projectMeta}>{project.location}</span>
                      {project.buildType && (
                        <span className={styles.buildTypePill}>{project.buildType}</span>
                      )}
                    </div>
                    <span
                      className={styles.statusBadge}
                      data-status={project.status}
                    >
                      {STATUS_LABEL[project.status] ?? project.status}
                    </span>
                  </div>

                  <div className={styles.cardProgress}>
                    <div className={styles.progressTrack}>
                      <div
                        className={styles.progressFill}
                        style={{ '--progress-pct': `${progress}%` } as React.CSSProperties}
                        role="progressbar"
                        aria-valuenow={progress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${progress}% complete`}
                      />
                    </div>
                    <span className={styles.progressLabel}>
                      {approved}/{total} phases complete
                    </span>
                  </div>

                  <div className={styles.cardFooter}>
                    {project.totalBudget != null && (
                      <span className={styles.footerItem}>
                        Budget:{' '}
                        {new Intl.NumberFormat('en-NG', {
                          style: 'currency',
                          currency: project.currency ?? 'NGN',
                          maximumFractionDigits: 0,
                        }).format(project.totalBudget)}
                      </span>
                    )}
                    <span className={styles.footerItem}>
                      {project._count.submissions} submission{project._count.submissions !== 1 ? 's' : ''}
                    </span>
                  </div>
                </a>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
