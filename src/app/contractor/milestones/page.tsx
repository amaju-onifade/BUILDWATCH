import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Home, ClipboardList, ChevronLeft, Check } from 'lucide-react'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import styles from './page.module.css'

const PAYMENT_STATUS: Record<string, { label: string; className: string }> = {
  approved: { label: 'Paid', className: 'statusPaid' },
  under_review: { label: 'Under review', className: 'statusReview' },
  in_progress: { label: 'In progress', className: 'statusReview' },
  pending: { label: 'Locked', className: 'statusLocked' },
  locked: { label: 'Locked', className: 'statusLocked' },
}

export default async function ContractorMilestonesPage() {
  const session = await getSession()
  if (!session || session.role !== 'contractor') redirect('/login')

  const memberships = await prisma.projectMembers.findMany({
    where: { userId: session.userId, role: 'contractor' },
    include: {
      project: {
        include: {
          milestones: { orderBy: { order: 'asc' } },
        },
      },
    },
    orderBy: { joinedAt: 'desc' },
  })

  const membership = memberships[0] ?? null
  if (!membership) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyState}>
          <div className={styles.emptyTitle}>No projects assigned</div>
        </div>
      </div>
    )
  }

  const project = membership.project
  const activeMilestone = project.milestones.find(m => m.status === 'in_progress' || m.status === 'under_review')

  return (
    <div className={styles.page}>
      <div className={styles.statusBar}>
        <span>{new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
        <span></span>
      </div>
      <div className={styles.topbar}>
        <Link href="/contractor" className={styles.backBtn}><ChevronLeft size={22} /></Link>
        <span className={styles.topbarTitle}>Milestones & payments</span>
      </div>
      <div className={styles.content}>
        {project.milestones.map((m, i) => {
          const status = PAYMENT_STATUS[m.status] ?? { label: m.status, className: 'statusLocked' }
          const isPaid = m.status === 'approved'
          const isActive = m.status === 'under_review' || m.status === 'in_progress'
          const isLocked = m.status === 'locked' || m.status === 'pending'

          return (
            <div key={m.id} className={`${styles.card} ${isPaid ? styles.cardPaid : ''} ${isActive ? styles.cardActive : ''} ${isLocked ? styles.cardLocked : ''}`}>
              <div className={styles.cardHeader}>
                <span className={styles.phaseName}>Phase {m.order} — {m.name}</span>
                <span className={`${styles.statusBadge} ${styles[status.className]}`}>{status.label}</span>
              </div>
              <div className={styles.paymentAmount}>{m.plannedCostTotal ? `₦${m.plannedCostTotal.toLocaleString()}` : '—'}</div>
              {isPaid && <div className={styles.paymentDate}>Paid</div>}
              {isActive && (
                <div className={styles.activeAction}>
                  {activeMilestone?.id === m.id && m.status === 'under_review' && (
                    <div className={styles.uploadPrompt}>Submitted · Awaiting owner approval</div>
                  )}
                  <Link href={`/field/projects/${project.id}/milestones/${m.id}/submit`} className={styles.uploadBtn}>
                    Upload more evidence
                  </Link>
                </div>
              )}
              {isLocked && m.order > 1 && (
                <div className={styles.lockedHint}>Unlocks after Phase {m.order - 1} approved</div>
              )}
            </div>
          )
        })}
      </div>
      <div className={styles.bottomNav}>
        <Link href="/contractor" className={styles.navItem}>
          <span className={styles.navIcon}><Home size={20} /></span>
          <span className={styles.navLabel}>Home</span>
        </Link>
        <Link href="/contractor/milestones" className={`${styles.navItem} ${styles.navActive}`}>
          <span className={styles.navIcon}><ClipboardList size={20} /></span>
          <span className={styles.navLabel}>Milestones</span>
        </Link>
      </div>
    </div>
  )
}
