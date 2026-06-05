import { redirect } from 'next/navigation'
import Link from 'next/link'
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
  })
  if (!membership) notFound()

  const milestone = await prisma.milestones.findFirst({
    where: { id: milestoneId, projectId },
    select: { id: true, name: true, status: true },
  })
  if (!milestone) notFound()

  if (milestone.status === 'approved' || milestone.status === 'locked') {
    return (
      <div className={styles.page}>
        <div className={styles.blocked}>
          <h1 className={styles.blockedTitle}>This phase is already {milestone.status}</h1>
          <p className={styles.blockedDesc}>You cannot submit photos for a phase that has been completed or locked.</p>
          <Link href={`/field/projects/${projectId}`} className={styles.backBtn}>
            Back to project
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <Link href={`/field/projects/${projectId}`} className={styles.backLink}>
        ← Back to {milestone.name}
      </Link>

      <div className={styles.header}>
        <h1 className={styles.title}>Submit Progress</h1>
        <p className={styles.subtitle}>{milestone.name}</p>
      </div>

      <PhotoUploader
        projectId={projectId}
        milestoneId={milestoneId}
      />
    </div>
  )
}
