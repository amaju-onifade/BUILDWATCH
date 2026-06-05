import React from 'react'
import styles from './ProjectHealthCard.module.css'

interface ProjectHealthCardProps {
  totalBudget: number
  spentAmount: number
  totalPhases: number
  completedPhases: number
  currency: string
}

export function ProjectHealthCard({
  totalBudget,
  spentAmount,
  totalPhases,
  completedPhases,
  currency,
}: ProjectHealthCardProps) {
  const budgetProgress = totalBudget > 0 ? (spentAmount / totalBudget) * 100 : 0
  const timeProgress = totalPhases > 0 ? (completedPhases / totalPhases) * 100 : 0
  
  // Health is "Healthy" if budget progress <= time progress + 10% tolerance
  const isHealthy = budgetProgress <= timeProgress + 10
  const statusLabel = isHealthy ? 'On Track' : 'Over Budget'

  const formatter = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: currency || 'NGN',
    maximumFractionDigits: 0,
  })

  return (
    <div className={styles.container} data-healthy={isHealthy}>
      <div className={styles.header}>
        <h3 className={styles.title}>Project Health</h3>
        <span className={styles.statusBadge} data-status={isHealthy ? 'ok' : 'warn'}>
          {statusLabel}
        </span>
      </div>

      <div className={styles.metricsGrid}>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Budget Spent</span>
          <span className={styles.metricValue}>{formatter.format(spentAmount)}</span>
          <div className={styles.barContainer}>
            <div 
              className={styles.barFill} 
              style={{ width: `${Math.min(budgetProgress, 100)}%`, background: 'var(--color-primary)' }} 
            />
          </div>
          <span className={styles.metricSub}>{Math.round(budgetProgress)}% of total</span>
        </div>

        <div className={styles.metric}>
          <span className={styles.metricLabel}>Timeline Progress</span>
          <span className={styles.metricValue}>{completedPhases} / {totalPhases} Phases</span>
          <div className={styles.barContainer}>
            <div 
              className={styles.barFill} 
              style={{ width: `${Math.min(timeProgress, 100)}%`, background: 'var(--color-secondary)' }} 
            />
          </div>
          <span className={styles.metricSub}>{Math.round(timeProgress)}% complete</span>
        </div>
      </div>

      <div className={styles.chartArea}>
        {/* Simple SVG comparison chart */}
        <svg viewBox="0 0 200 100" className={styles.healthSvg}>
          <rect x="20" y="20" width="160" height="60" rx="4" fill="var(--color-surface-container-low)" />
          {/* Timeline bar */}
          <rect x="20" y="20" width={1.6 * timeProgress} height="30" fill="var(--color-secondary)" opacity="0.3" rx="4" />
          {/* Budget line */}
          <line x1={20 + 1.6 * budgetProgress} y1="15" x2={20 + 1.6 * budgetProgress} y2="85" stroke="var(--color-error)" strokeWidth="2" strokeDasharray="4 2" />
          
          <text x="25" y="40" className={styles.svgText}>Timeline</text>
          <text x={18 + 1.6 * budgetProgress} y="10" className={styles.svgTextLabel}>Spending</text>
        </svg>
      </div>

      <p className={styles.insight}>
        {isHealthy 
          ? "You've completed more of the project than you've spent. Excellent efficiency." 
          : "Spending is slightly ahead of physical progress. Review recent change orders."}
      </p>
    </div>
  )
}
