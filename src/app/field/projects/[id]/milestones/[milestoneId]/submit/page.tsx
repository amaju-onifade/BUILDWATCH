import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Camera } from 'lucide-react'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { PhotoUploader } from '@/modules/submissions/components/PhotoUploader/PhotoUploader'
import styles from './page.module.css'

type Props = {
  params: Promise<{ id: string; milestoneId: string }>
}

export default async function SubmitPage({ params }: Props) {
  const { id: projectId, milestoneId } = await params
  const session = await getSession()
  if (!session || (session.role !== 'proxy' && session.role !== 'contractor')) redirect('/login')

  const membership = await prisma.projectMembers.findFirst({
    where: { projectId, userId: session.userId },
    include: { user: { select: { fullName: true } } },
  })
  if (!membership) notFound()

  const milestone = await prisma.milestones.findFirst({
    where: { id: milestoneId, projectId },
    select: { id: true, name: true, status: true, order: true },
  })
  if (!milestone) notFound()

  if (milestone.status === 'approved' || milestone.status === 'locked') {
    return (
      <div className={styles.mobilePage}>
        <div className={styles.statusBar}>
          <span>{new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
          <span></span>
        </div>
        <div className={styles.mobileTopbar}>
          <Link href={`/field/projects/${projectId}`} className={styles.backBtn}><ChevronLeft size={22} /></Link>
          <span className={styles.topbarTitle}>Blocked</span>
        </div>
        <div className={styles.blocked}>
          <div className={styles.blockedTitle}>This phase is already {milestone.status}</div>
          <div className={styles.blockedDesc}>You cannot submit photos for a phase that has been completed or locked.</div>
          <Link href={`/field/projects/${projectId}`} className={styles.primaryBtn}>Back to project</Link>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.mobilePage}>
      <div className={styles.statusBar}>
        <span>{new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
        <span></span>
      </div>
      <div className={styles.mobileTopbar}>
        <Link href={`/field/projects/${projectId}`} className={styles.backBtn}><ChevronLeft size={22} /></Link>
        <span className={styles.topbarTitle}>Add photos</span>
        <span className={styles.stepBadge}>Step 1 of 2</span>
      </div>
      <div className={styles.mobileContent}>
        <div className={styles.phaseTag}><Camera size={14} /> Phase {milestone.order} — {milestone.name} (auto-selected)</div>
        <PhotoUploader
          projectId={projectId}
          milestoneId={milestoneId}
        />
      </div>
    </div>
  )
}
