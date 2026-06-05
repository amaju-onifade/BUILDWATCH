import React from 'react'
import { prisma } from '@/lib/db'
import { getDownloadUrl } from '../../lib/storage'
import styles from './SubmissionFeed.module.css'

type Props = {
  projectId: string
}

export async function SubmissionFeed({ projectId }: Props) {
  const submissions = await prisma.submissions.findMany({
    where: { projectId },
    include: {
      photos: true,
      milestone: { select: { name: true } },
      submittedBy: { select: { fullName: true } },
      aiReport: true
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  })

  if (submissions.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No activity yet. Your team&apos;s photo updates will appear here.</p>
      </div>
    )
  }

  return (
    <div className={styles.feed}>
      <h2 className={styles.title}>Project Activity</h2>
      <div className={styles.list}>
        {await Promise.all(submissions.map(async (submission) => {
          const photoUrls = await Promise.all(
            submission.photos.map(p => getDownloadUrl(p.storageKey))
          )

          return (
            <div key={submission.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.headerInfo}>
                  <div className={styles.authorBadge}>
                    {submission.submittedBy.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className={styles.headerText}>
                    <span className={styles.authorName}>{submission.submittedBy.fullName}</span>
                    <span className={styles.actionText}>submitted photos for</span>
                    <span className={styles.milestoneName}>{submission.milestone.name}</span>
                  </div>
                </div>
                <span className={styles.timestamp}>
                  {submission.createdAt.toISOString().split('T')[0]} {submission.createdAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {submission.caption && (
                <p className={styles.caption}>{submission.caption}</p>
              )}

              {submission.aiReport && (
                <div className={styles.aiReport}>
                  <div className={styles.aiHeader}>
                    <div className={styles.aiBadgeGroup}>
                      <span className={styles.aiBadge}>AI Inspection Report</span>
                      <span className={styles.aiConfidence} data-level={submission.aiReport.confidenceLevel}>
                        {submission.aiReport.confidenceLevel} Confidence
                      </span>
                    </div>
                  </div>

                  <div className={styles.aiSection}>
                    <strong>S1. What is Visible:</strong>
                    <p>{submission.aiReport.overallAssessment}</p>
                  </div>

                  <div className={styles.aiSection}>
                    <strong>S2. Stage Assessment:</strong>
                    <p>{submission.aiReport.progressIndicator}</p>
                  </div>

                  {submission.aiReport.concerns && (Array.isArray(submission.aiReport.concerns) ? (submission.aiReport.concerns.length > 0) : !!submission.aiReport.concerns) && (
                    <div className={styles.aiConcerns}>
                      <strong>S3. Anomalies & Concerns:</strong>
                      <ul>
                        {Array.isArray(submission.aiReport.concerns) ? (
                          (submission.aiReport.concerns as string[]).map((con, k) => (
                            <li key={k}>{con}</li>
                          ))
                        ) : (
                          <li>{submission.aiReport.concerns as string}</li>
                        )}
                      </ul>
                    </div>
                  )}

                  {submission.aiReport.limitations && (
                    <div className={styles.aiLimitations}>
                      <strong>S4. Mandatory Limitations:</strong>
                      <ul>
                        {Array.isArray(submission.aiReport.limitations) ? (
                          (submission.aiReport.limitations as string[]).map((lim, l) => (
                            <li key={l}>{lim}</li>
                          ))
                        ) : (
                          <li>{submission.aiReport.limitations as string}</li>
                        )}
                      </ul>
                    </div>
                  )}

                  {submission.aiReport.recommendedOwnerAction && (
                    <div className={styles.aiAction}>
                      <strong>Recommended Owner Action:</strong>
                      <p>{submission.aiReport.recommendedOwnerAction}</p>
                    </div>
                  )}
                </div>
              )}

              <div className={styles.photoGrid}>
                {photoUrls.map((url, i) => (
                  <div key={i} className={styles.photoWrap}>
                    <img src={url} alt={`Submission photo ${i + 1}`} className={styles.photo} />
                  </div>
                ))}
              </div>
            </div>
          )
        }))}
      </div>
    </div>
  )
}
