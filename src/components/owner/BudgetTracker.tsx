'use client'

import React from 'react'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import styles from './BudgetTracker.module.css'

function fmt(n: number): string {
  return `₦${n.toLocaleString()}`
}

export type BudgetTrackerProps = {
  userName?: string
  userInitials?: string
  userPlan?: string
  projectName?: string
  totalBudget?: number
  milestonesDb?: { id: string; name: string; plannedCostTotal: number | null; status: string; order: number }[]
}

export default function BudgetTracker({
  userName,
  userInitials,
  userPlan,
  projectName = 'My Project',
  totalBudget = 0,
  milestonesDb = [],
}: BudgetTrackerProps) {
  const phases = milestonesDb.map(m => ({
    name: m.name,
    planned: m.plannedCostTotal ?? 0,
    actual: m.status === 'approved' ? (m.plannedCostTotal ?? 0) : m.status === 'in_progress' || m.status === 'under_review' ? Math.round((m.plannedCostTotal ?? 0) * 0.3) : null,
    status: (m.status === 'approved' ? 'done' : m.status === 'in_progress' || m.status === 'under_review' ? 'review' : 'locked') as 'done' | 'review' | 'locked',
    active: m.status === 'in_progress' || m.status === 'under_review',
  }))

  const totalBudgetVal = totalBudget
  const released = phases.reduce((sum, p) => sum + (p.actual ?? 0), 0)
  const remaining = totalBudgetVal - released

  return (
    <div className={styles.shell}>
      <Sidebar activeItem="Budget" projectName={projectName} userName={userName} userInitials={userInitials} userPlan={userPlan} />
      <div className={styles.mainArea}>
        <Topbar title="Budget Tracker" />
        <div className={styles.content}>
          <div className={styles.statGrid}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Total budget</div>
              <div className={styles.statValue}>{fmt(totalBudget)}</div>
            </div>
            <div className={`${styles.statCard} ${styles.statGreen}`}>
              <div className={styles.statLabel}>Released</div>
              <div className={styles.statValue}>{fmt(released)}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Remaining</div>
              <div className={styles.statValue}>{fmt(remaining)}</div>
            </div>
          </div>

          <div className={styles.tableCard}>
            <div className={styles.tableTitle}>Phase breakdown — planned vs actual</div>
            <div className={styles.tableHeader}>
              <span>Phase</span>
              <span style={{ textAlign: 'right' }}>Planned</span>
              <span style={{ textAlign: 'right' }}>Actual</span>
              <span style={{ textAlign: 'right' }}>Variance</span>
              <span style={{ textAlign: 'center' }}>Status</span>
            </div>
            {phases.map((p, i) => {
              const variance = p.actual !== null ? p.actual - p.planned : null
              const isOver = variance !== null && variance > 0
              return (
                <div key={i} className={`${styles.budgetRow} ${p.active ? styles.budgetRowActive : ''} ${p.status === 'locked' ? styles.budgetRowLocked : ''}`}>
                  <span className={styles.phaseName}>
                    {p.name}
                    {p.active && <span className={styles.activeBadge}>Active</span>}
                  </span>
                  <span className={styles.cellRight}>{fmt(p.planned)}</span>
                  <span className={`${styles.cellRight} ${p.actual !== null ? (isOver ? styles.textOver : styles.textOk) : styles.textMuted}`}>
                    {p.actual !== null ? fmt(p.actual) : '—'}
                  </span>
                  <span className={`${styles.cellRight} ${variance !== null ? (isOver ? styles.textOver : styles.textOk) : styles.textMuted}`} style={{ width: 80 }}>
                    {variance !== null ? `${isOver ? '+' : '-'}${fmt(Math.abs(variance))}` : '—'}
                  </span>
                  <span className={styles.cellCenter}>
                    <span className={`${styles.statusChip} ${styles[`status${p.status.charAt(0).toUpperCase() + p.status.slice(1)}`]}`}>
                      {p.status === 'done' ? 'Done' : p.status === 'review' ? 'Review' : 'Locked'}
                    </span>
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
