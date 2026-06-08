import { ArrowRight } from 'lucide-react'
import styles from './HeartbeatBanner.module.css'

export type HeartbeatState = 'active' | 'warning' | 'overdue'

export type HeartbeatBannerProps = {
  state: HeartbeatState
  daysSinceLastUpdate: number
  lastSubmittedBy: string
  lastSubmissionDate: string
  onChaseProxy?: () => void
}

export default function HeartbeatBanner({
  state,
  daysSinceLastUpdate,
  lastSubmittedBy,
  lastSubmissionDate,
  onChaseProxy,
}: HeartbeatBannerProps) {
  return (
    <div className={styles.banner} data-state={state}>
      <div className={styles.dot} />
      <span className={styles.text}>
        Last site update: <strong>{daysSinceLastUpdate} days ago</strong> —
        {' '}{lastSubmissionDate} · by {lastSubmittedBy}
      </span>
      {state === 'overdue' && (
        <button type="button" className={styles.chaseLink} onClick={onChaseProxy}>
          Chase proxy <ArrowRight size={14} />
        </button>
      )}
    </div>
  )
}
