'use client'

import { useState } from 'react'
import { ArrowRight, X } from 'lucide-react'
import styles from './ActionRequiredBanner.module.css'

export type ActionRequiredBannerProps = {
  count: number
  message: string
  onReview?: () => void
}

export default function ActionRequiredBanner({ count, message, onReview }: ActionRequiredBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div className={styles.banner}>
      <span className={styles.countBadge}>{count}</span>
      <span className={styles.text}>{message}</span>
      <button type="button" className={styles.reviewLink} onClick={onReview}>
        Review now <ArrowRight size={14} />
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
