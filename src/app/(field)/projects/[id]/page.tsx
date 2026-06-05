import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import styles from './page.module.css'

type Props = {
  params: Promise<{ id: string }>
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  under_review: 'Under Review',
  approved: 'Approved',
  locked: 'Locked',
}

export default async function FieldProjectDetailPage({ params }: Props) {
  const { id } = await params
  const session = await getSession()
  if (!session || (session.role !== 'proxy' && session.role !== 'contractor')) redirect('/login')

  const membership = await prisma.projectMembers.findFirst({
    where: { projectId: id, userId: session.userId },
  })
  if (!membership) notFound()

  const project = await prisma.projects.findUnique({
    where: { id },
    include: {
      milestones: {
        orderBy: { order: 'asc' },
        select: {
          id: true,
          name: true,
          order: true,
          status: true,
          plannedCostTotal: true,
          currency: true,
        },
      },
    },
  })
  if (!project) notFound()

  return (
    <div className={styles.page}>
      <Link href="/field" className={styles.backLink}>
        ← Back to projects
      </Link>

      <header className={styles.header}>
        <h1 className={styles.title}>{project.name}</h1>
        <p className={styles.subtitle}>{project.location}</p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Milestones & Phases</h2>
        <div className={styles.milestoneList}>
          {project.milestones.map((m, idx) => (
            <div key={m.id} className={styles.milestoneCard}>
              <div className={styles.milestoneOrder}>{idx + 1}</div>
              <div className={styles.milestoneInfo}>
                <span className={styles.milestoneName}>{m.name}</span>
                <span className={styles.milestoneStatus} data-status={m.status}>
                  {STATUS_LABEL[m.status] || m.status}
                </span>
              </div>
              <div className={styles.milestoneActions}>
                {m.status !== 'approved' && m.status !== 'locked' && (
                  <Link
                    href={`/field/projects/${id}/milestones/${m.id}/submit`}
                    className={styles.submitLink}
                    id={`btn-submit-milestone-${m.id}`}
                  >
                    Submit Photos
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
