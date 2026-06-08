'use client'

import React from 'react'
import styles from './MilestoneActionBar.module.css'

type MilestoneActionBarProps = {
  onApprove: () => void
  onQuery: () => void
  onRequestEvidence: () => void
}

export function MilestoneActionBar({ onApprove, onQuery, onRequestEvidence }: MilestoneActionBarProps) {
  return (
    <div className={styles.bar}>
      <button type="button" className={styles.approveBtn} onClick={onApprove}>
        Approve milestone
      </button>
      <button type="button" className={styles.queryBtn} onClick={onQuery}>
        Query submission
      </button>
      <button type="button" className={styles.ghostBtn} onClick={onRequestEvidence}>
        Request more evidence
      </button>
    </div>
  )
}
