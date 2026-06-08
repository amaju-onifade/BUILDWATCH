import styles from './ProgressCard.module.css'

export type ProgressCardProps = {
  currentPhaseNumber: number
  totalPhases: number
  progressPercent: number
  estimatedCompletion: string
}

export default function ProgressCard({
  currentPhaseNumber,
  totalPhases,
  progressPercent,
  estimatedCompletion,
}: ProgressCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.title}>Project progress</span>
        <span className={styles.phaseLabel}>Phase {currentPhaseNumber} of {totalPhases}</span>
      </div>
      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${progressPercent}%` }} />
      </div>
      <div className={styles.footer}>
        <span className={styles.footerText}>{progressPercent}% complete</span>
        <span className={styles.footerText}>Est. completion: {estimatedCompletion}</span>
      </div>
    </div>
  )
}
