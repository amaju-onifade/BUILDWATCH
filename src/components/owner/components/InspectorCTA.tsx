import { ArrowRight } from 'lucide-react'
import styles from './InspectorCTA.module.css'

export type InspectorCTAProps = {
  onRegisterInterest?: () => void
}

export default function InspectorCTA({ onRegisterInterest }: InspectorCTAProps) {
  return (
    <div className={styles.card}>
      <div className={styles.textContent}>
        <div className={styles.headerRow}>
          <span className={styles.heading}>Get a verified inspector on site</span>
          <span className={styles.soonBadge}>Coming soon</span>
        </div>
        <p className={styles.body}>
          A COREN-registered engineer visits your site independently — separate
          from your proxy and contractor.
        </p>
      </div>
      <button type="button" className={styles.btn} onClick={onRegisterInterest}>
        Register interest <ArrowRight size={14} />
      </button>
    </div>
  )
}
