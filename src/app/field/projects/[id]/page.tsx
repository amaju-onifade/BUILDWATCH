import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Camera, Home, ClipboardList, FileText, ChevronLeft, MapPin, Check } from 'lucide-react'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import styles from './page.module.css'

type Props = {
  params: Promise<{ id: string }>
}

export default async function FieldProjectDetailPage({ params }: Props) {
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
    include: {
      owner: { select: { fullName: true } },
      milestones: { orderBy: { order: 'asc' } },
      submissions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          milestone: { select: { name: true } },
          _count: { select: { photos: true } },
        },
      },
    },
  })
  if (!project) notFound()

  const roleLabel = session.role === 'proxy' ? 'Site Proxy' : 'Contractor'
  const userName = membership.user.fullName
  const firstName = userName.split(' ')[0]
  const currentMilestone = project.milestones.find(m => m.status === 'in_progress' || m.status === 'under_review')
  const approvedCount = project.milestones.filter(m => m.status === 'approved').length
  const totalMilestones = project.milestones.length
  const progressPct = totalMilestones > 0 ? Math.round((approvedCount / totalMilestones) * 100) : 0
  const lastSubmission = project.submissions[0] ?? null
  const ownerFirstName = project.owner.fullName.split(' ')[0]

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening'

  return (
    <div className={styles.mobilePage}>
      {/* Status bar simulation */}
      <div className={styles.statusBar}>
        <span>{now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
        <span></span>
      </div>

      {/* Top bar */}
      <div className={styles.mobileTopbar}>
        <Link href="/field" className={styles.backBtn}><ChevronLeft size={22} /></Link>
        <span className={styles.logoText}>Build<span className={styles.logoAccent}>Watch</span></span>
        <div className={styles.spacer} />
        <Link href={`/field/projects/${id}/log`} className={styles.notifBtn}><FileText size={18} /></Link>
      </div>

      {/* Content */}
      <div className={styles.mobileContent}>
        {/* Greeting */}
        <div className={styles.greetingSection}>
          <div className={styles.greeting}>{greeting}, {firstName} 👋</div>
          <div className={styles.projectLoc}>{project.name} · {project.location}</div>
        </div>

        {/* Current phase card */}
        <div className={styles.phaseCard}>
          <div className={styles.phaseHeader}>
            <span className={styles.phaseLabel}>Current phase</span>
            {currentMilestone && (
              <span className={styles.phaseBadge}>
                {currentMilestone.status === 'under_review' ? 'Under Review' : 'Active'}
              </span>
            )}
          </div>
          <div className={styles.phaseName}>
            {currentMilestone
              ? `Phase ${currentMilestone.order} — ${currentMilestone.name}`
              : 'All phases complete'}
          </div>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
          </div>
          <div className={styles.progressMeta}>{approvedCount} of {totalMilestones} phases complete</div>
        </div>

        {/* Big CTA */}
        {currentMilestone && currentMilestone.status !== 'approved' && (
          <Link
            href={`/field/projects/${id}/milestones/${currentMilestone.id}/submit`}
            className={styles.cameraCta}
          >
            <div className={styles.cameraIcon}><Camera size={32} /></div>
            <div className={styles.cameraLabel}>Submit site update</div>
            <div className={styles.cameraSub}>Takes less than 2 minutes</div>
          </Link>
        )}

        {/* Last submission */}
        {lastSubmission ? (
          <>
            <div className={styles.sectionLabel}>Your last submission</div>
            <div className={styles.submissionCard}>
              <div className={styles.submissionRow}>
                <div className={styles.subThumb}><Camera size={24} /></div>
                <div className={styles.subContent}>
                  <div className={styles.subTitle}>
                    {lastSubmission._count.photos} photo{lastSubmission._count.photos !== 1 ? 's' : ''} — {lastSubmission.milestone.name}
                  </div>
                  <div className={styles.subMeta}>
                    {lastSubmission.createdAt.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · {' '}
                    {lastSubmission.createdAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} ·{' '}
                    {lastSubmission.status === 'delivered' ? 'Delivered' : lastSubmission.status}
                  </div>
                </div>
                <span className={styles.statusSent}><Check size={12} /> Sent</span>
              </div>
            </div>
          </>
        ) : (
          <div className={styles.noSubmission}>
            No submissions yet. Tap the button above to send your first site update.
          </div>
        )}

        {/* Phase info link */}
        <Link href={`/field/projects/${id}/history`} className={styles.viewAllLink}>
          View all submissions →
        </Link>
      </div>

      {/* Bottom nav */}
      <div className={styles.bottomNav}>
        <Link href={`/field/projects/${id}`} className={`${styles.navItem} ${styles.navActive}`}>
          <span className={styles.navIcon}><Home size={20} /></span>
          <span className={styles.navLabel}>Home</span>
        </Link>
        <Link href={`/field/projects/${id}/history`} className={styles.navItem}>
          <span className={styles.navIcon}><ClipboardList size={20} /></span>
          <span className={styles.navLabel}>History</span>
        </Link>
        <Link href={`/field/projects/${id}/log`} className={styles.navItem}>
          <span className={styles.navIcon}><FileText size={20} /></span>
          <span className={styles.navLabel}>My log</span>
        </Link>
      </div>
    </div>
  )
}
