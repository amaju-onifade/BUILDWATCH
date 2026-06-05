import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import styles from './page.module.css'

export default async function FieldDashboardPage() {
  const session = await getSession()
  if (!session || (session.role !== 'proxy' && session.role !== 'contractor')) redirect('/login')

  const memberships = await prisma.projectMembers.findMany({
    where: { userId: session.userId },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          location: true,
          buildType: true,
          status: true,
          _count: {
            select: { milestones: true, submissions: true },
          },
        },
      },
    },
    orderBy: { joinedAt: 'desc' },
  })

  const roleLabel = session.role === 'proxy' ? 'Site Proxy' : 'Contractor'

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>My Projects</h1>
          <p className={styles.pageSubtitle}>
            {memberships.length === 0
              ? 'You have not been assigned to any projects yet.'
              : `${memberships.length} project${memberships.length !== 1 ? 's' : ''} — ${roleLabel}`}
          </p>
        </div>
      </div>

      {memberships.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>No projects assigned</p>
          <p className={styles.emptyDesc}>
            Ask the project owner to invite you to a project. You will see it here once assigned.
          </p>
        </div>
      ) : (
        <div className={styles.projectList}>
          {memberships.map((m) => {
            const p = m.project
            return (
              <Link
                key={p.id}
                href={`/field/projects/${p.id}`}
                className={styles.projectCard}
                id={`field-project-card-${p.id}`}
              >
                <div className={styles.cardTop}>
                  <div className={styles.cardInfo}>
                    <span className={styles.projectName}>{p.name}</span>
                    <span className={styles.projectMeta}>{p.location}</span>
                    {p.buildType && <span className={styles.buildTypePill}>{p.buildType}</span>}
                  </div>
                  <span className={styles.cardRole}>{roleLabel}</span>
                </div>
                <div className={styles.cardFooter}>
                  <span>{p._count.milestones} phase{p._count.milestones !== 1 ? 's' : ''}</span>
                  <span>{p._count.submissions} submission{p._count.submissions !== 1 ? 's' : ''}</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
