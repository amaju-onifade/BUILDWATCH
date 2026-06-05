import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { ApproveButton } from '@/modules/milestones/components/ApproveButton/ApproveButton'
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

export default async function PhasesPage({ params }: Props) {
  const { id } = await params
  const session = await getSession()
  if (!session || session.role !== 'owner') redirect('/login')

  const project = await prisma.projects.findFirst({
    where: { id, ownerId: session.userId },
    select: { name: true },
  })
  if (!project) notFound()

  const milestones = await prisma.milestones.findMany({
    where: { projectId: id },
    orderBy: { order: 'asc' },
  })

  const total = milestones.length
  const approved = milestones.filter(m => m.status === 'approved').length
  const progress = total > 0 ? Math.round((approved / total) * 100) : 0

  return (
    <div className={styles.page}>
      <Link href={`/dashboard/projects/${id}`} className={styles.backLink}>
        &larr; Back to project
      </Link>

      <div className={styles.header}>
        <h1 className={styles.title}>{project.name} — Phases</h1>
        <div className={styles.headerMeta}>
          <span className={styles.headerStat}>{total} phases</span>
          <span className={styles.headerStat}>{approved} approved</span>
          <span className={styles.headerStat}>{progress}% complete</span>
        </div>
      </div>

      <div className={styles.list}>
        {milestones.map((m, idx) => (
          <div key={m.id} className={styles.card}>
            <div className={styles.cardLeft}>
              <span className={styles.orderBadge}>{idx + 1}</span>
              <div className={styles.cardInfo}>
                <span className={styles.cardName}>{m.name}</span>
                {m.plannedCostTotal != null && (
                  <span className={styles.cardBudget}>
                    {new Intl.NumberFormat('en-NG', {
                      style: 'currency',
                      currency: m.currency ?? 'NGN',
                      maximumFractionDigits: 0,
                    }).format(m.plannedCostTotal)}
                  </span>
                )}
              </div>
            </div>
            <div className={styles.cardRight}>
              <span className={styles.cardStatus} data-status={m.status}>
                {STATUS_LABEL[m.status] ?? m.status}
              </span>
              {m.status === 'under_review' && (
                <ApproveButton projectId={id} milestoneId={m.id} />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
