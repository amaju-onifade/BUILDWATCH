import { Camera, AlertTriangle } from 'lucide-react'
import styles from './SubmissionPreview.module.css'

export type SubmissionPreviewProps = {
  submittedBy: string
  submissionDate: string
  phaseName: string
}

export default function SubmissionPreview({
  submittedBy,
  submissionDate,
  phaseName,
}: SubmissionPreviewProps) {
  return (
    <div className={styles.card}>
      <div className={styles.title}>Latest submission</div>
      <div className={styles.photoGrid}>
        <div className={styles.thumb}>
          <Camera size={20} />
          <span className={styles.aiBadge}>AI <AlertTriangle size={10} /></span>
        </div>
        <div className={styles.thumb}><Camera size={20} /></div>
        <div className={styles.thumb}><Camera size={20} /></div>
      </div>
      <div className={styles.meta}>
        Submitted by {submittedBy} · {submissionDate} · {phaseName}
      </div>
    </div>
  )
}
