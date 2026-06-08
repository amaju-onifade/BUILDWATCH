'use client'

import React from 'react'
import styles from './MilestoneRow.module.css'

export type MilestoneStatus = 'approved' | 'under_review' | 'in_progress' | 'locked' | 'pending'

export type Milestone = {
  id: string
  phaseNumber: number
  name: string
  status: MilestoneStatus
  approvedDate?: string
  submittedDate?: string
  lockedReason?: string
  plannedCost: number
}

type MilestoneRowProps = {
  milestone: Milestone
  isExpanded: boolean
  onToggle: () => void
  onExportPdf?: () => void
  children?: React.ReactNode
}

const STATUS_CLASS: Record<MilestoneStatus, string> = {
  approved: 'Approved',
  under_review: 'UnderReview',
  in_progress: 'InProgress',
  locked: 'Locked',
  pending: 'Pending',
}

export function MilestoneRow({ milestone, isExpanded, onToggle, onExportPdf, children }: MilestoneRowProps) {
  const isClickable = milestone.status === 'approved' || milestone.status === 'under_review' || milestone.status === 'in_progress'
  const isDimmed = milestone.status === 'locked' || milestone.status === 'pending'
  const statusClass = STATUS_CLASS[milestone.status]

  const getMetadata = () => {
    if (milestone.status === 'approved') return `Approved ${milestone.approvedDate}`
    if (milestone.status === 'under_review') return `Submitted ${milestone.submittedDate}`
    if (milestone.status === 'in_progress') return 'In Progress'
    if (milestone.status === 'locked') return milestone.lockedReason || 'Locked'
    return ''
  }

  const getStatusLabel = () => {
    if (milestone.status === 'approved') return 'Approved'
    if (milestone.status === 'under_review') return 'Under Review'
    if (milestone.status === 'in_progress') return 'In Progress'
    if (milestone.status === 'locked') return 'Locked'
    return 'Pending'
  }

  return (
    <div
      className={`${styles.row} ${styles[milestone.status]} ${isExpanded ? styles.expanded : ''} ${isClickable ? styles.clickable : ''} ${isDimmed ? styles.dimmed : ''}`}
    >
      <div className={styles.rowHeader} onClick={isClickable ? onToggle : undefined}>
        <span className={`${styles.dot} ${styles[`dot${statusClass}`]}`} />
        <span className={styles.phaseNumber}>{milestone.phaseNumber}</span>
        <span className={`${styles.phaseName} ${milestone.status === 'under_review' ? styles.phaseNameBold : ''}`}>
          {milestone.name}
          {milestone.status === 'under_review' && (
            <span className={styles.actionBadge}>Action required</span>
          )}
        </span>
        <span className={styles.metadata}>{getMetadata()}</span>
        <span className={`${styles.statusChip} ${styles[`status${statusClass}`]}`}>
          {getStatusLabel()}
        </span>
        {milestone.status === 'approved' && (
          <button
            type="button"
            className={styles.pdfBtn}
            onClick={(e) => { e.stopPropagation(); onExportPdf?.() }}
          >
            PDF
          </button>
        )}
      </div>
      {children}
    </div>
  )
}
