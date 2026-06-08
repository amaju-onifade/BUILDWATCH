'use client'

import { useState } from 'react'
import { ArrowRight, X } from 'lucide-react'
import styles from './AIAnomalyAlert.module.css'

export type AIAnomalyAlertProps = {
  message: string
  onViewReport?: () => void
}

export default function AIAnomalyAlert({ message, onViewReport }: AIAnomalyAlertProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div className={styles.alert}>
      <span className={styles.aiChip}>AI</span>
      <span className={styles.text}>{message}</span>
      <button type="button" className={styles.viewLink} onClick={onViewReport}>
        View report <ArrowRight size={14} />
      </button>
      <button
        className={styles.dismissBtn}
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  )
}
