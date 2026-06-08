import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Camera, Home, ClipboardList, FileText, ChevronLeft, Check } from 'lucide-react'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import styles from './page.module.css'

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  delivered: { label: 'Delivered', className: 'statusDelivered' },
  reviewed: { label: 'Approved', className: 'statusApproved' },
  queried: { label: 'Queried', className: 'statusQueried' },
}

type Props = { params: Promise<{ id: string }> }

export default async function HistoryPage({ params }: Props) {
  const { id } = await params
  const session = await getSession()
  if (!session || (session.role !== 'proxy' && session.role !== 'contractor')) redirect('/login')

  const membership = await prisma.projectMembers.findFirst({
    where: { projectId: id, userId: session.userId },
  })
  if (!membership) notFound()

  const submissions = await prisma.submissions.findMany({
    where: { projectId: id, submittedById: session.userId },
    orderBy: { createdAt: 'desc' },
    include: {
      milestone: { select: { name: true, order: true } },
      _count: { select: { photos: true } },
    },
  })

  return (
    <div className={styles.mobilePage}>
      <div className={styles.statusBar}>
        <span>{new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
        <span></span>
      </div>
      <div className={styles.mobileTopbar}>
        <Link href={`/field/projects/${id}`} className={styles.backBtn}><ChevronLeft size={22} /></Link>
        <span className={styles.topbarTitle}>Submission history</span>
      </div>
      <div className={styles.mobileContent}>
        {submissions.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyTitle}>No submissions yet</div>
            <div className={styles.emptyDesc}>Your submitted site updates will appear here.</div>
          </div>
        ) : (
          <div className={styles.list}>
            {submissions.map(s => {
              const status = STATUS_LABELS[s.status] ?? { label: s.status, className: 'statusDelivered' }
              return (
                <div key={s.id} className={styles.card}>
                  <div className={styles.row}>
                    <div className={styles.thumb}><Camera size={24} /></div>
                    <div className={styles.content}>
                      <div className={styles.title}>{s._count.photos} photo{s._count.photos !== 1 ? 's' : ''} — Phase {s.milestone.order}: {s.milestone.name}</div>
                      <div className={styles.meta}>
                        {s.createdAt.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: '2-digit' })} · {' '}
                        {s.createdAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <span className={`${styles.statusBadge} ${styles[status.className] || styles.statusDelivered}`}>{status.label}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <div className={styles.bottomNav}>
        <Link href={`/field/projects/${id}`} className={styles.navItem}>
          <span className={styles.navIcon}><Home size={20} /></span>
          <span className={styles.navLabel}>Home</span>
        </Link>
        <Link href={`/field/projects/${id}/history`} className={`${styles.navItem} ${styles.navActive}`}>
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
