import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import styles from './page.module.css'

export default async function ContractorHomePage() {
  const session = await getSession()
  if (!session || session.role !== 'contractor') redirect('/login')

  const memberships = await prisma.projectMembers.findMany({
    where: { userId: session.userId, role: 'contractor' },
    include: {
      project: {
        include: {
          owner: { select: { fullName: true } },
          milestones: { orderBy: { order: 'asc' } },
          submissions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
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
          <div className={styles.emptyDesc}>Ask the project owner to invite you as a contractor.</div>
        </div>
      </div>
    )
  }

  const project = membership.project
  const ownerName = project.owner.fullName
  const firstName = ownerName.split(' ')[0]
  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Welcome' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const currentMilestone = project.milestones.find(m => m.status === 'in_progress' || m.status === 'under_review')
  const approvedCount = project.milestones.filter(m => m.status === 'approved').length
  const totalMilestones = project.milestones.length
  const progressPct = totalMilestones > 0 ? Math.round((approvedCount / totalMilestones) * 100) : 0

  const nextPayment = currentMilestone?.plannedCostTotal ?? 0

  return (
    <div className={styles.page}>
      <div className={styles.statusBar}>
        <span>{now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
        <span>📶 🔋</span>
      </div>
      <div className={styles.topbar}>
        <span className={styles.logoText}>Build<span className={styles.logoAccent}>Watch</span></span>
        <div className={styles.spacer} />
      </div>
      <div className={styles.content}>
        <div className={styles.greeting}>{greeting}, Emeka 👷</div>
        <div className={styles.projectLoc}>{project.name} · {project.location}</div>

        <div className={styles.paymentGate}>
          <div className={styles.gateLabel}>Next payment gate</div>
          <div className={styles.gateAmount}>₦{nextPayment.toLocaleString()}</div>
          <div className={styles.gateDesc}>On approval of {currentMilestone ? `Phase ${currentMilestone.order} — ${currentMilestone.name}` : '—'}</div>
          <div className={styles.gateDivider} />
          <div className={styles.gateStatus}>
            Status: <strong>{currentMilestone?.status === 'under_review' ? 'Awaiting owner review' : currentMilestone?.status === 'in_progress' ? 'In progress' : '—'}</strong>
          </div>
        </div>

        <div className={styles.phaseCard}>
          <div className={styles.phaseLabel}>Current phase</div>
          <div className={styles.phaseName}>
            {currentMilestone ? `Phase ${currentMilestone.order} — ${currentMilestone.name}` : 'All phases complete'}
          </div>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
          </div>
          <div className={styles.progressMeta}>Phase {currentMilestone?.order ?? totalMilestones} of {totalMilestones} · {currentMilestone?.status === 'under_review' ? 'Submitted for review' : '—'}</div>
        </div>

        <Link href={`/field/projects/${project.id}/milestones/${currentMilestone?.id ?? ''}/submit`} className={styles.primaryBtn}>
          Upload phase evidence
        </Link>
        <Link href="/contractor/milestones" className={styles.secondaryBtn}>
          View milestones & payments
        </Link>
      </div>
      <div className={styles.bottomNav}>
        <Link href="/contractor" className={`${styles.navItem} ${styles.navActive}`}>
          <span className={styles.navIcon}>🏠</span>
          <span className={styles.navLabel}>Home</span>
        </Link>
        <Link href="/contractor/milestones" className={styles.navItem}>
          <span className={styles.navIcon}>📋</span>
          <span className={styles.navLabel}>Milestones</span>
        </Link>
      </div>
    </div>
  )
}
