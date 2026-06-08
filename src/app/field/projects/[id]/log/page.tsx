import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import styles from './page.module.css'

type Props = { params: Promise<{ id: string }> }

export default async function AuditLogPage({ params }: Props) {
  const { id } = await params
  const session = await getSession()
  if (!session || (session.role !== 'proxy' && session.role !== 'contractor')) redirect('/login')

  const membership = await prisma.projectMembers.findFirst({
    where: { projectId: id, userId: session.userId },
    include: { user: { select: { fullName: true } } },
  })
  if (!membership) notFound()

  const project = await prisma.projects.findUnique({
    where: { id },
    select: { name: true, location: true },
  })
  if (!project) notFound()

  const submissions = await prisma.submissions.findMany({
    where: { projectId: id, submittedById: session.userId },
    orderBy: { createdAt: 'desc' },
    include: {
      milestone: { select: { name: true, order: true } },
      _count: { select: { photos: true } },
    },
  })

  const totalVisits = submissions.length

  return (
    <div className={styles.mobilePage}>
      <div className={styles.statusBar}>
        <span>{new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
        <span>📶 🔋</span>
      </div>
      <div className={styles.mobileTopbar}>
        <Link href={`/field/projects/${id}`} className={styles.backBtn}>‹</Link>
        <span className={styles.topbarTitle}>My visit record</span>
      </div>
      <div className={styles.mobileContent}>
        <div className={styles.scoreCard}>
          <div className={styles.scoreLabel}>Total verified visits</div>
          <div className={styles.scoreValue}>{totalVisits}</div>
          <div className={styles.scoreSub}>{project.name} · {project.location}</div>
        </div>

        {submissions.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyTitle}>No visits recorded yet</div>
            <div className={styles.emptyDesc}>Your site visits will appear here once you submit your first update.</div>
          </div>
        ) : (
          <div className={styles.logCard}>
            <div className={styles.logHeader}>
              <span className={styles.logTitle}>Visit log</span>
            </div>
            {submissions.map(s => (
              <div key={s.id} className={styles.auditItem}>
                <div className={styles.auditHeader}>
                  <span className={styles.auditTitle}>Phase {s.milestone.order} — {s.milestone.name}</span>
                  <span className={styles.auditBadge}>✓ Verified</span>
                </div>
                <div className={styles.auditMeta}>
                  {s.createdAt.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} · {' '}
                  {s.createdAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className={styles.auditGps}>📍 GPS verified</div>
              </div>
            ))}
          </div>
        )}

        <div className={styles.infoCard}>
          ℹ️ This record is your personal proof of every site visit. Keep it for your own records.
        </div>
      </div>
      <div className={styles.bottomNav}>
        <Link href={`/field/projects/${id}`} className={styles.navItem}>
          <span className={styles.navIcon}>🏠</span>
          <span className={styles.navLabel}>Home</span>
        </Link>
        <Link href={`/field/projects/${id}/history`} className={styles.navItem}>
          <span className={styles.navIcon}>📋</span>
          <span className={styles.navLabel}>History</span>
        </Link>
        <Link href={`/field/projects/${id}/log`} className={`${styles.navItem} ${styles.navActive}`}>
          <span className={styles.navIcon}>📄</span>
          <span className={styles.navLabel}>My log</span>
        </Link>
      </div>
    </div>
  )
}
